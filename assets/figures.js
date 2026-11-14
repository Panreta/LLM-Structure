// figures.js: classical, interactive figures for diagrams that set
// `figure: <name>` in _data/diagrams.yml. Each figure draws an SVG in a
// 600×400 viewBox. Parts of the drawing carry data-part="<block slug>",
// so tapping them opens that block's notes (app.js does the opening).
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg", W = 600, H = 400, uid = 0;
  var specs = {};

  // ---------- helpers ----------
  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function div(cls, text) {
    var e = document.createElement("div");
    e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // Fixed decimals with a real minus sign and no "-0.00".
  function num(v, d) {
    d = d == null ? 2 : d;
    if (Math.abs(v) < 0.5 * Math.pow(10, -d)) v = 0;
    return v.toFixed(d).replace(/^-/, "−");
  }
  function signed(v, d) { return (v >= 0 ? "+" : "") + num(v, d); }
  function sci(v) {
    if (v >= 0.01) return num(v, 3);
    var e = Math.floor(Math.log(v) / Math.LN10);
    return num(v / Math.pow(10, e), 2) + " × 10<sup>" + num(e, 0) + "</sup>";
  }

  var BOX = { l: 44, r: 16, t: 16, b: 32 };

  // Map math coordinates to the viewBox. box holds the margins.
  function scale(xd, yd, box) {
    box = box || BOX;
    var sx = (W - box.l - box.r) / (xd[1] - xd[0]), sy = (H - box.t - box.b) / (yd[1] - yd[0]);
    return {
      xd: xd, yd: yd, box: box, sx: sx, sy: sy,
      x: function (v) { return box.l + (v - xd[0]) * sx; },
      y: function (v) { return H - box.b - (v - yd[0]) * sy; },
      ix: function (px) { return xd[0] + (px - box.l) / sx; },
      iy: function (py) { return yd[0] + (H - box.b - py) / sy; }
    };
  }

  // ---------- painter: what a figure's render() draws with ----------
  function Painter(svg, labels, opts, clipId) {
    this.svg = svg;
    this.labels = labels;
    this.thumb = !!opts.thumb;
    this.parts = opts.parts || null;
    this.clipId = clipId;
    this.seen = {};
    this.fresh = [];
  }
  var P = Painter.prototype;

  P.has = function (part) { return part && !this.thumb && (!this.parts || this.parts.indexOf(part) >= 0); };

  // A group. Tagged with a block slug, it becomes tappable.
  P.g = function (part, clip) {
    var g = mk("g", { "clip-path": clip ? "url(#" + this.clipId + ")" : null }, this.svg);
    if (this.has(part)) {
      g.setAttribute("class", "part");
      g.setAttribute("data-part", part);
    }
    return g;
  };
  P.line = function (g, x1, y1, x2, y2, cls) { return mk("line", { x1: x1, y1: y1, x2: x2, y2: y2, "class": cls }, g); };
  P.path = function (g, d, cls) { return mk("path", { d: d, "class": cls }, g); };
  P.poly = function (g, pts, cls, closed) {
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("");
    return this.path(g, d + (closed ? "Z" : ""), cls);
  };
  P.circle = function (g, cx, cy, r, cls) { return mk("circle", { cx: cx, cy: cy, r: r, "class": cls }, g); };
  P.ellipse = function (g, cx, cy, rx, ry, cls) { return mk("ellipse", { cx: cx, cy: cy, rx: rx, ry: ry, "class": cls }, g); };
  P.rect = function (g, x, y, w, h, cls) {
    return mk("rect", { x: Math.min(x, x + w), y: Math.min(y, y + h), width: Math.abs(w), height: Math.abs(h), "class": cls }, g);
  };
  // A line with a filled arrowhead at (x2, y2).
  P.arrow = function (g, x1, y1, x2, y2, cls) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy);
    if (L < 1) return;
    var ux = dx / L, uy = dy / L, s = Math.min(13, L * 0.6), w = s * 0.42;
    var bx = x2 - ux * s, by = y2 - uy * s;
    this.line(g, x1, y1, bx + ux, by + uy, "vec " + (cls || ""));
    this.poly(g, [[x2, y2], [bx - uy * w, by + ux * w], [bx + uy * w, by - ux * w]], "head " + (cls || ""), true);
  };
  P.text = function (g, x, y, s, anchor) {
    if (this.thumb) return;
    mk("text", { x: x, y: y, "class": "tick-text", "text-anchor": anchor || "middle" }, g).textContent = s;
  };
  // A MathJax label laid over the SVG. pos says which side of (x, y) it sits on.
  P.label = function (key, tex, x, y, pos, part) {
    if (this.thumb) return;
    this.seen[key] = true;
    var e = this.labels.querySelector('[data-key="' + key + '"]');
    if (!e) {
      e = document.createElement("span");
      e.setAttribute("data-key", key);
      e.textContent = "\\(" + tex + "\\)";
      this.labels.appendChild(e);
      this.fresh.push(e);
    }
    e.className = "fig-label at-" + (pos || "c");
    if (this.has(part)) e.setAttribute("data-part", part); else e.removeAttribute("data-part");
    e.style.left = (x / W * 100) + "%";
    e.style.top = (y / H * 100) + "%";
    e.hidden = false;
  };
  // Axes through the origin (or along the plot edges), with optional ticks.
  P.axes = function (sc, o) {
    o = o || {};
    var g = this.g(null), b = sc.box, self = this;
    var ay = sc.yd[0] <= 0 && sc.yd[1] >= 0 ? sc.y(0) : H - b.b;
    var ax = sc.xd[0] <= 0 && sc.xd[1] >= 0 ? sc.x(0) : b.l;
    this.arrow(g, sc.x(sc.xd[0]), ay, W - 4, ay, "axis c-muted");
    this.arrow(g, ax, sc.y(sc.yd[0]), ax, 4, "axis c-muted");
    (o.xticks || []).forEach(function (v) {
      self.line(g, sc.x(v), ay, sc.x(v), ay + 6, "tick");
      self.text(g, sc.x(v), ay + 22, String(v));
    });
    (o.yticks || []).forEach(function (v) {
      self.line(g, ax - 6, sc.y(v), ax, sc.y(v), "tick");
      self.text(g, ax - 10, sc.y(v) + 5, String(v), "end");
    });
    if (o.xlabel) this.label("xlabel", o.xlabel, W - 6, ay + 6, "sw");
    if (o.ylabel) this.label("ylabel", o.ylabel, ax + 8, 4, "se");
  };

  // ---------- mount: one figure with its controls ----------
  function mount(host, name, opts) {
    var spec = specs[name];
    opts = opts || {};
    var state = {}, current = null, drawn = false, ctlBox = null, ctlSig = null;
    // controls is a list, or a function of the state (rebuilt when it changes)
    function ctls() { return typeof spec.controls === "function" ? spec.controls(state) : spec.controls || []; }
    ctls().forEach(function (c) { state[c.key] = c.value; });
    if (spec.init) spec.init(state, !!opts.thumb);

    var id = "figclip" + (++uid), box = spec.box || BOX;
    var wrap = div(opts.thumb ? "fig-thumb" : "figure");
    var stage = div("fig-stage");
    var svg = mk("svg", { viewBox: "0 0 " + W + " " + H, "class": "fig" + (opts.thumb ? " thumb" : "") + (spec.drag ? " draggable" : "") }, stage);
    if (opts.thumb) svg.setAttribute("aria-hidden", "true");
    else { svg.setAttribute("role", "img"); svg.setAttribute("aria-label", spec.alt); }
    var labels = div("fig-labels");
    stage.appendChild(labels);
    wrap.appendChild(stage);

    var readout = null;
    if (!opts.thumb) {
      if (spec.controls) { ctlBox = div("fig-controls"); wrap.appendChild(ctlBox); }
      readout = div("fig-readout");
      readout.setAttribute("aria-live", "polite");
      wrap.appendChild(readout);
      if (spec.hint) wrap.appendChild(div("fig-hint", spec.hint));
      pointer();
    }
    host.appendChild(wrap);
    draw();

    function draw() {
      box = spec.box || BOX;
      while (svg.lastChild) svg.removeChild(svg.lastChild);
      var cp = mk("clipPath", { id: id }, mk("defs", {}, svg));
      mk("rect", { x: box.l, y: box.t, width: W - box.l - box.r, height: H - box.t - box.b }, cp);
      var p = new Painter(svg, labels, opts, id);
      var out = spec.render.call(spec, state, p) || "";
      Array.prototype.forEach.call(labels.children, function (e) {
        if (!p.seen[e.getAttribute("data-key")]) e.hidden = true;
      });
      if (readout) readout.innerHTML = out;
      if (ctlBox) controls();
      if (drawn && p.fresh.length && opts.typeset) opts.typeset(labels);
      drawn = true;
      mark();
    }

    function controls() {
      var list = ctls(), sig = list.map(function (c) { return c.key; }).join(" ");
      if (sig === ctlSig) return;
      ctlSig = sig;
      var box = ctlBox;
      while (box.lastChild) box.removeChild(box.lastChild);
      list.forEach(function (c) {
        if (c.type === "choice") {
          var row = div("fig-control");
          row.appendChild(div("fig-control-label", c.label));
          var seg = div("segs");
          seg.setAttribute("role", "group");
          seg.setAttribute("aria-label", c.label);
          c.options.forEach(function (o) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "seg";
            b.textContent = o[1];
            b.setAttribute("aria-pressed", String(state[c.key] === o[0]));
            b.addEventListener("click", function () {
              state[c.key] = o[0];
              Array.prototype.forEach.call(seg.children, function (x) { x.setAttribute("aria-pressed", String(x === b)); });
              draw();
            });
            seg.appendChild(b);
          });
          row.appendChild(seg);
          box.appendChild(row);
          return;
        }
        var lab = document.createElement("label");
        lab.className = "fig-control";
        lab.appendChild(div("fig-control-label", c.label));
        var input = document.createElement("input");
        input.type = "range";
        input.min = c.min; input.max = c.max; input.step = c.step; input.value = state[c.key];
        var out = document.createElement("output");
        out.textContent = c.show(state[c.key]);
        input.addEventListener("input", function () {
          state[c.key] = parseFloat(input.value);
          out.textContent = c.show(state[c.key]);
          draw();
        });
        lab.appendChild(input);
        lab.appendChild(out);
        box.appendChild(lab);
      });
    }

    // Tap a part to open it; drag (spec.drag) or tap empty space (spec.click).
    function pointer() {
      var down = null, dragging = false;
      function at(e) {
        var m = svg.getScreenCTM(), pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        return m ? pt.matrixTransform(m.inverse()) : pt;
      }
      stage.addEventListener("pointerdown", function (e) {
        if (e.button) return;
        var t = e.target.closest ? e.target.closest("[data-part]") : null;
        down = { x: e.clientX, y: e.clientY, part: t && t.getAttribute("data-part"), moved: false };
        dragging = !!(spec.drag && spec.drag(state, at(e), "start"));
        if (dragging) { stage.setPointerCapture(e.pointerId); e.preventDefault(); }
      });
      stage.addEventListener("pointermove", function (e) {
        if (!down) return;
        if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 4) down.moved = true;
        if (dragging && down.moved) { spec.drag(state, at(e), "move"); draw(); }
      });
      stage.addEventListener("pointerup", function (e) {
        var d = down;
        down = null;
        dragging = false;
        if (!d || d.moved) return;
        if (d.part && opts.onPart) opts.onPart(d.part);
        else if (spec.click && spec.click(state, at(e))) draw();
      });
      stage.addEventListener("pointercancel", function () { down = null; dragging = false; });
    }

    // Mark the open block's parts. A figure with select() may also redraw for it.
    function highlight(slug) {
      current = slug;
      if (spec.select && spec.select(state, slug)) draw(); else mark();
    }
    function mark() {
      var slug = current;
      Array.prototype.forEach.call(stage.querySelectorAll("[data-part]"), function (n) {
        n.classList.toggle("on", n.getAttribute("data-part") === slug);
      });
    }
    return { highlight: highlight };
  }

  // ---------- the figures ----------

  // Riemann sums under y = x² on [0, 1].
  specs["riemann-integral"] = {
    alt: "Graph of y = x squared on [0, 1], with Riemann-sum rectangles under the curve and the exact area shaded.",
    controls: [
      { key: "n", label: "Rectangles", min: 1, max: 50, step: 1, value: 6, show: function (v) { return "n = " + v; } },
      { key: "rule", label: "Sample point", type: "choice", value: "right",
        options: [["left", "Left"], ["mid", "Midpoint"], ["right", "Right"]] }
    ],
    hint: "Raise n: the rectangles close in on the shaded area. Tap any part of the figure for details.",
    render: function (s, p) {
      var sc = scale([-0.14, 1.3], [-0.12, 1.16]), X = sc.x, Y = sc.y;
      var f = function (x) { return x * x; }, n = s.n, dx = 1 / n, sum = 0, i;

      var area = [[X(0), Y(0)]];
      for (i = 0; i <= 100; i++) area.push([X(i / 100), Y(f(i / 100))]);
      area.push([X(1), Y(0)]);
      p.poly(p.g("integral"), area, "fill c-accent", true);

      var gr = p.g("riemann-sum");
      for (i = 0; i < n; i++) {
        var xl = i * dx, xs = s.rule === "left" ? xl : s.rule === "mid" ? xl + dx / 2 : xl + dx, h = f(xs);
        sum += h * dx;
        p.rect(gr, X(xl), Y(h), X(xl + dx) - X(xl), Y(0) - Y(h), "bar");
        if (n <= 20) p.circle(gr, X(xs), Y(h), 3.5, "dot");
      }

      p.axes(sc, { yticks: [1], xlabel: "x", ylabel: "y" });

      var gp = p.g("partition");
      for (i = 0; i <= n; i++) p.line(gp, X(i * dx), Y(0) - 6, X(i * dx), Y(0) + 6, "tick strong");
      p.line(gp, X(0), Y(0), X(1), Y(0), "hit");
      p.label("a", "a", X(0), Y(0) + 8, "s", "partition");
      p.label("b", "b", X(1), Y(0) + 8, "s", "partition");
      if (n <= 10) p.label("dx", "\\Delta x", X(1 - dx / 2), Y(0) + 8, "s", "partition");

      var curve = [];
      for (i = 0; i <= 100; i++) curve.push([X(1.05 * i / 100), Y(f(1.05 * i / 100))]);
      var gf = p.g("function", true);
      p.poly(gf, curve, "curve");
      p.poly(gf, curve, "hit");
      p.label("f", "y = x^2", X(1.05), Y(f(1.05)), "e", "function");

      return "<i>S<sub>n</sub></i> = " + num(sum, 4) + " &nbsp;·&nbsp; exact area 1/3 ≈ 0.3333 &nbsp;·&nbsp; error " + signed(sum - 1 / 3, 4);
    }
  };

  // A = [[2,1],[1,2]] acting on the plane, through A_t = (1−t)I + tA.
  specs.diagonalization = {
    alt: "The plane under the matrix A: the grid and unit circle are mapped to a slanted grid and an ellipse, while vectors on the two eigenlines are only stretched.",
    box: { l: 12, r: 12, t: 12, b: 12 },
    controls: [
      { key: "t", label: "Apply A", min: 0, max: 1, step: 0.01, value: 1, show: function (v) { return "t = " + v.toFixed(2); } }
    ],
    hint: "Slide t to apply A gradually and drag the tip of x. Brown arrows only stretch along the dashed eigenlines.",
    init: function (s) { s.x = [1, 0]; },
    render: function (s, p) {
      var sc = this.sc = scale([-3.45, 3.45], [-2.25, 2.25], this.box), X = sc.x, Y = sc.y, t = s.t, k, i;
      function M(v) { return [(1 + t) * v[0] + t * v[1], t * v[0] + (1 + t) * v[1]]; }
      function at(v) { return [X(v[0]), Y(v[1])]; }
      var l1 = 1 + 2 * t, x = s.x, c1 = (x[0] + x[1]) / 2, c2 = (x[0] - x[1]) / 2;
      var u1 = [c1, c1], u2 = [c2, -c2], w1 = [l1 * c1, l1 * c1], w2 = u2, Ax = M(x), O = at([0, 0]);

      var gi = p.g("image", true);
      for (k = -6; k <= 6; k++) {
        p.poly(gi, [at(M([k, -6])), at(M([k, 6]))], "grid");
        p.poly(gi, [at(M([-6, k])), at(M([6, k]))], "grid");
      }
      var g0 = p.g(null);
      p.line(g0, X(-3.45), O[1], X(3.45), O[1], "axisline");
      p.line(g0, O[0], Y(-2.25), O[0], Y(2.25), "axisline");
      var circle = [], ellipse = [];
      for (i = 0; i <= 96; i++) {
        var a = i / 96 * 2 * Math.PI, e = [Math.cos(a), Math.sin(a)];
        circle.push(at(e));
        ellipse.push(at(M(e)));
      }
      p.poly(g0, circle, "curve thin c-muted dash", true);
      p.poly(gi, ellipse, "curve c-accent", true);

      var gc = p.g("coordinates", true);
      p.poly(gc, [at([-3, -3]), at([3, 3])], "curve thin c-warm dash");
      p.poly(gc, [at([-3, 3]), at([3, -3])], "curve thin c-warm dash");
      p.poly(gc, [at(u1), at(x), at(u2)], "curve thin c-muted dash");
      p.label("v1", "\\mathbf{v}_1", X(2.05), Y(2.05), "w", "coordinates");
      p.label("v2", "\\mathbf{v}_2", X(2.05), Y(-2.05), "w", "coordinates");

      var gb = p.g("change-back");
      p.poly(gb, [at(w1), at(Ax), at(w2)], "curve thin c-accent dash");

      var gs = p.g("scale");
      p.arrow(gs, O[0], O[1], X(w1[0]), Y(w1[1]), "c-warm");
      p.arrow(gs, O[0], O[1], X(w2[0]), Y(w2[1]), "c-warm");
      p.label("w1", "\\lambda_1 c_1 \\mathbf{v}_1", X(w1[0]), Y(w1[1]), "nw", "scale");
      p.label("w2", "\\lambda_2 c_2 \\mathbf{v}_2", X(w2[0]), Y(w2[1]), "se", "scale");

      var gv = p.g("vector");
      p.arrow(gv, O[0], O[1], X(x[0]), Y(x[1]), "");
      p.circle(gv, X(x[0]), Y(x[1]), 14, "hitc");
      p.label("x", "\\mathbf{x}", X(x[0]), Y(x[1]) + 4, "s", "vector");

      var ga = p.g("image");
      p.arrow(ga, O[0], O[1], X(Ax[0]), Y(Ax[1]), "c-accent");
      p.label("Ax", "A_t\\mathbf{x}", X(Ax[0]), Y(Ax[1]), "ne", "image");

      return "<i>A<sub>t</sub></i> = (1 − <i>t</i>)<i>I</i> + <i>tA</i> &nbsp;·&nbsp; eigenvalues λ<sub>1</sub> = " + num(l1) +
        ", λ<sub>2</sub> = 1 &nbsp;·&nbsp; <b>x</b> = (" + num(x[0]) + ", " + num(x[1]) + ") ↦ (" + num(Ax[0]) + ", " + num(Ax[1]) + ")";
    },
    drag: function (s, pt, phase) {
      var sc = this.sc;
      if (phase === "start") return Math.abs(pt.x - sc.x(s.x[0])) + Math.abs(pt.y - sc.y(s.x[1])) < 26;
      var v = [sc.ix(pt.x), sc.iy(pt.y)], r = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
      s.x = r > 1 ? [v[0] / r, v[1] / r] : v;
    }
  };

  // Beta(2,2) prior on a coin's bias, updated by h heads and t tails.
  specs["bayes-rule"] = {
    alt: "Prior, likelihood and posterior densities for the bias of a coin, plotted against theta from 0 to 1.",
    controls: [
      { key: "h", label: "Heads", min: 0, max: 30, step: 1, value: 7, show: function (v) { return String(v); } },
      { key: "t", label: "Tails", min: 0, max: 30, step: 1, value: 3, show: function (v) { return String(v); } }
    ],
    hint: "Add flips: the posterior moves from the prior toward the observed frequency and gets narrower.",
    render: function (s, p) {
      var N = 200, i, th, pr = [], lk = [], po = [], ZL = 0, ZJ = 0;
      for (i = 0; i <= N; i++) {
        th = i / N;
        pr.push(6 * th * (1 - th));
        lk.push(Math.pow(th, s.h) * Math.pow(1 - th, s.t));
      }
      for (i = 0; i <= N; i++) {
        var wgt = (i === 0 || i === N ? 0.5 : 1) / N;
        ZL += lk[i] * wgt;
        ZJ += lk[i] * pr[i] * wgt;
      }
      var top = 1.5;
      for (i = 0; i <= N; i++) {
        lk[i] /= ZL;
        po.push(lk[i] * ZL * pr[i] / ZJ);
        top = Math.max(top, lk[i], po[i]);
      }
      var sc = scale([-0.08, 1.1], [0, top * 1.18]), X = sc.x, Y = sc.y;
      function pts(arr) { return arr.map(function (v, j) { return [X(j / N), Y(v)]; }); }
      function peak(arr) { var m = 0; arr.forEach(function (v, j) { if (v > arr[m]) m = j; }); return m; }

      var gpo = p.g("posterior");
      p.poly(gpo, [[X(0), Y(0)]].concat(pts(po), [[X(1), Y(0)]]), "fill c-accent", true);
      p.poly(gpo, pts(po), "curve c-accent");
      p.poly(gpo, pts(po), "hit");

      p.axes(sc, { xticks: [0, 0.5, 1], xlabel: "\\theta" });

      var gpr = p.g("prior");
      p.poly(gpr, pts(pr), "curve c-muted dash");
      p.poly(gpr, pts(pr), "hit");

      var glk = p.g("likelihood");
      p.poly(glk, pts(lk), "curve c-warm dotted");
      p.poly(glk, pts(lk), "hit");

      var right = (s.h + 1) / (s.h + s.t + 2) >= 0.5, ip = peak(po), il = peak(lk), ir = right ? 36 : 164;
      p.label("po", "p(\\theta \\mid x)", X(ip / N), Y(po[ip]), right ? "nw" : "ne", "posterior");
      p.label("lk", "p(x \\mid \\theta)", X(il / N), Y(lk[il]), right ? "ne" : "nw", "likelihood");
      p.label("pr", "p(\\theta)", X(ir / N), Y(pr[ir]), right ? "nw" : "ne", "prior");

      return s.h + " heads, " + s.t + " tails &nbsp;·&nbsp; evidence <i>p</i>(<i>x</i>) = " + sci(ZJ) +
        " &nbsp;·&nbsp; posterior Beta(" + (s.h + 2) + ", " + (s.t + 2) + "), mean " + num((s.h + 2) / (s.h + s.t + 4), 3);
    }
  };

  // From gradient descent to Muon, one optimizer per chapter, on the valley
  // f(x) = ½(x₁ − 1.2)² + 12.5(x₂ − 0.4)² (curvatures 1 and 25).
  var GD = { A: [1.2, 0.4], K: 25, B2: 0.99 };
  GD.f = function (v) { var a = v[0] - GD.A[0], b = v[1] - GD.A[1]; return (a * a + GD.K * b * b) / 2; };
  GD.grad = function (v) { return [v[0] - GD.A[0], GD.K * (v[1] - GD.A[1])]; };
  // Five Newton–Schulz steps, as in Muon. On a diagonal matrix they act on
  // each singular value s separately, pushing it toward 1.
  GD.ns = function (s) { for (var j = 0; j < 5; j++) s = 3.4445 * s - 4.7750 * s * s * s + 2.0315 * s * s * s * s * s; return s; };
  GD.names = { "gradient-descent": "Gradient descent", momentum: "Momentum", nesterov: "Nesterov", rmsprop: "RMSProp", adam: "Adam", adamw: "AdamW", muon: "Muon" };
  GD.tex = { "gradient-descent": "\\text{GD}", momentum: "\\text{Momentum}", nesterov: "\\text{Nesterov}", rmsprop: "\\text{RMSProp}", adam: "\\text{Adam}", adamw: "\\text{AdamW}", muon: "\\text{Muon}" };
  GD.ghost = { momentum: "gradient-descent", nesterov: "momentum", rmsprop: "gradient-descent", adam: "rmsprop", adamw: "adam", muon: "adam" };
  GD.run = function (opt, s) {
    var x = s.x0.slice(), v = [0, 0], m = [0, 0], q = [0, 0], xs = [x], k, i;
    for (k = 1; k <= s.T; k++) {
      var eta, beta, d = [0, 0], g;
      if (opt === "gradient-descent") { eta = s.etaGD; d = GD.grad(x); }
      else if (opt === "momentum" || opt === "nesterov") {
        eta = s[opt === "momentum" ? "etaM" : "etaN"]; beta = s[opt === "momentum" ? "betaM" : "betaN"];
        g = GD.grad(opt === "nesterov" ? [x[0] - eta * beta * v[0], x[1] - eta * beta * v[1]] : x);
        v = [beta * v[0] + g[0], beta * v[1] + g[1]];
        d = v;
      } else if (opt === "rmsprop") {
        eta = s.etaR; g = GD.grad(x);
        for (i = 0; i < 2; i++) { q[i] = s.rho * q[i] + (1 - s.rho) * g[i] * g[i]; d[i] = g[i] / (Math.sqrt(q[i]) + 1e-8); }
      } else if (opt === "adam" || opt === "adamw") {
        eta = s.etaA; g = GD.grad(x);
        for (i = 0; i < 2; i++) {
          m[i] = s.beta1 * m[i] + (1 - s.beta1) * g[i];
          q[i] = GD.B2 * q[i] + (1 - GD.B2) * g[i] * g[i];
          d[i] = (m[i] / (1 - Math.pow(s.beta1, k))) / (Math.sqrt(q[i] / (1 - Math.pow(GD.B2, k))) + 1e-8);
          if (opt === "adamw") d[i] += s.lam * x[i];
        }
      } else {
        eta = s.etaMu; g = GD.grad(x);
        v = [s.betaMu * v[0] + g[0], s.betaMu * v[1] + g[1]];
        var u = [g[0] + s.betaMu * v[0], g[1] + s.betaMu * v[1]], n = Math.sqrt(u[0] * u[0] + u[1] * u[1]) + 1e-7;
        d = [GD.ns(u[0] / n), GD.ns(u[1] / n)];
      }
      x = [x[0] - eta * d[0], x[1] - eta * d[1]];
      xs.push(x);
      if (Math.abs(x[0]) + Math.abs(x[1]) > 1e3) break;
    }
    return xs;
  };
  GD.until = function (xs) { for (var k = 0; k < xs.length; k++) if (GD.f(xs[k]) < 1e-3) return k; return -1; };

  function lr(key, max, value) {
    return { key: key, label: "Learning rate", min: max / 40, max: max, step: max / 40, value: value, show: function (v) { return "η = " + num(v, 3); } };
  }
  function mom(key, sym, value) {
    return { key: key, label: "Momentum", min: 0, max: 0.95, step: 0.05, value: value, show: function (v) { return sym + " = " + num(v); } };
  }
  var STEPS = { key: "T", label: "Steps", min: 1, max: 80, step: 1, value: 50, show: function (v) { return "T = " + v; } };
  GD.controls = {
    "gradient-descent": [lr("etaGD", 0.09, 0.07), STEPS],
    momentum: [lr("etaM", 0.06, 0.03), mom("betaM", "β", 0.8), STEPS],
    nesterov: [lr("etaN", 0.06, 0.03), mom("betaN", "β", 0.8), STEPS],
    rmsprop: [lr("etaR", 0.4, 0.15), { key: "rho", label: "Decay ρ", min: 0.5, max: 0.99, step: 0.01, value: 0.9, show: function (v) { return "ρ = " + num(v); } }, STEPS],
    adam: [lr("etaA", 0.4, 0.15), mom("beta1", "β₁", 0.9), STEPS],
    adamw: [lr("etaA", 0.4, 0.15), { key: "lam", label: "Weight decay", min: 0, max: 1.5, step: 0.05, value: 0.5, show: function (v) { return "λ = " + num(v); } }, STEPS],
    muon: [lr("etaMu", 0.4, 0.15), mom("betaMu", "β", 0.9), STEPS]
  };

  specs["gradient-descent"] = {
    alt: "Contour lines of a long, narrow valley with the path of the selected optimizer from a start point toward the minimum, and the previous optimizer's path for comparison.",
    box: { l: 12, r: 12, t: 12, b: 12 },
    story: true,
    controls: function (s) { return GD.controls[s.ch] || []; },
    hint: "Each chapter swaps in a new optimizer; the dashed path is the one it improves on. Tap empty space to move the start.",
    init: function (s) {
      s.ch = "momentum";
      s.x0 = [-2.2, 1.5];
      for (var c in GD.controls) GD.controls[c].forEach(function (o) { if (!(o.key in s)) s[o.key] = o.value; });
    },
    select: function (s, slug) {
      if (!slug || slug === s.ch) return false;
      s.ch = slug;
      return true;
    },
    render: function (s, p) {
      var sc = this.sc = scale([-2.8, 2.4], [-1.0, 2.395], this.box), X = sc.x, Y = sc.y, k;
      var A = GD.A, ch = s.ch, opt = GD.names[ch] ? ch : null, ghost = opt && GD.ghost[opt];

      var g0 = p.g(null);
      p.line(g0, X(-2.8), Y(0), X(2.4), Y(0), "axisline");
      p.line(g0, X(0), Y(-1), X(0), Y(2.395), "axisline");

      var go = p.g("objective", true);
      [0.05, 0.25, 0.6, 1.1, 1.8, 2.7, 3.8, 5.1, 6.6].forEach(function (c) {
        p.ellipse(go, X(A[0]), Y(A[1]), Math.sqrt(2 * c) * sc.sx, Math.sqrt(2 * c / GD.K) * sc.sy, "contour");
      });
      p.line(go, X(A[0]) - 7, Y(A[1]), X(A[0]) + 7, Y(A[1]), "curve");
      p.line(go, X(A[0]), Y(A[1]) - 7, X(A[0]), Y(A[1]) + 7, "curve");
      p.circle(go, X(A[0]), Y(A[1]), 14, "hitc");
      p.label("xs", "\\mathbf{x}^\\star", X(A[0]) + 6, Y(A[1]) - 4, "ne", "objective");

      if (ch === "gradient") {
        var gf = p.g("gradient");
        for (var a = -2.5; a <= 2.3; a += 0.6) for (var b = -0.7; b <= 2.3; b += 0.5) {
          var gr = GD.grad([a, b]), gn = Math.sqrt(gr[0] * gr[0] + gr[1] * gr[1]);
          if (gn < 1e-6) continue;
          var len = 0.28 * Math.min(1, Math.sqrt(gn / 6));
          p.arrow(gf, X(a), Y(b), X(a - len * gr[0] / gn), Y(b - len * gr[1] / gn), "c-muted thin");
        }
        var g = GD.grad(s.x0), gl = Math.sqrt(g[0] * g[0] + g[1] * g[1]);
        if (gl > 1e-6) {
          var tip = [s.x0[0] + 0.7 * g[0] / gl, s.x0[1] + 0.7 * g[1] / gl];
          p.arrow(gf, X(s.x0[0]), Y(s.x0[1]), X(tip[0]), Y(tip[1]), "c-warm");
          p.line(gf, X(s.x0[0]), Y(s.x0[1]), X(tip[0]), Y(tip[1]), "hit");
          p.label("grad", "\\nabla f(\\mathbf{x}_0)", X(tip[0]), Y(tip[1]), X(tip[0]) < W / 2 ? "e" : "w", "gradient");
        }
      }

      if (ch === "adamw") {
        var gz = p.g("adamw");
        p.circle(gz, X(0), Y(0), 4, "dot c-muted");
        p.label("zero", "\\mathbf{0}", X(0) - 4, Y(0) + 4, "sw", "adamw");
      }

      function trail(name, xs, main) {
        var pts = xs.map(function (v) { return [X(v[0]), Y(v[1])]; }), gp = p.g(name, true);
        p.poly(gp, pts, main ? "curve c-accent" : "curve thin c-muted dash");
        p.poly(gp, pts, "hit");
        if (main) for (k = 1; k < pts.length; k++) p.circle(gp, pts[k][0], pts[k][1], 3.5, "dot c-accent");
        var e = xs[xs.length - 1];
        if (main && e[0] > -2.7 && e[0] < 2.3 && e[1] > -0.9 && e[1] < 2.3 && xs.length > 1)
          p.label("xT", "\\mathbf{x}_T", pts[pts.length - 1][0], pts[pts.length - 1][1] + 6, "s", name);
      }
      var gxs = ghost && GD.run(ghost, s), xs = opt && GD.run(opt, s);
      if (gxs) {
        trail(ghost, gxs, false);
        var mid = gxs[Math.min(gxs.length - 1, 3)];
        p.label("ghost-" + ghost, GD.tex[ghost], X(mid[0]), Y(mid[1]) - 6, "n", ghost);
      }
      if (xs) trail(opt, xs, true);

      var gs = p.g(null);
      p.circle(gs, X(s.x0[0]), Y(s.x0[1]), 6, "dot");
      p.label("x0", "\\mathbf{x}_0", X(s.x0[0]) - 6, Y(s.x0[1]) - 6, "nw");

      function fate(name, run) {
        var e = run[run.length - 1], hit = GD.until(run), fx = GD.f(e);
        return "<b>" + GD.names[name] + "</b>: <i>f</i>(<b>x</b><sub><i>T</i></sub>) = " + (fx < 1e4 ? num(fx, 4) : "∞") +
          (hit >= 0 ? ", within 0.001 of the minimum after " + hit + " steps" : fx < 1e4 ? ", not within 0.001 in " + s.T + " steps" : ", diverged");
      }
      if (!opt) {
        var gx = GD.grad(s.x0);
        return "<b>x</b><sub>0</sub> = (" + num(s.x0[0]) + ", " + num(s.x0[1]) + ") &nbsp;·&nbsp; <i>f</i>(<b>x</b><sub>0</sub>) = " + num(GD.f(s.x0), 3) +
          " &nbsp;·&nbsp; ∇<i>f</i>(<b>x</b><sub>0</sub>) = (" + num(gx[0]) + ", " + num(gx[1]) + ") &nbsp;·&nbsp; curvatures 1 and 25";
      }
      return fate(opt, xs) + (gxs ? "<br><span class=\"muted\">vs " + fate(ghost, gxs) + "</span>" : "");
    },
    click: function (s, pt) {
      var sc = this.sc;
      s.x0 = [clamp(sc.ix(pt.x), -2.7, 2.3), clamp(sc.iy(pt.y), -0.9, 2.3)];
      return true;
    }
  };

  // Least-squares line through draggable points, with residual squares.
  specs["least-squares"] = {
    alt: "Scatter plot of five points with the least-squares line, vertical residuals, and a square drawn on each residual.",
    hint: "Drag the data points. The line always minimizes the total area of the squares.",
    init: function (s) { s.pts = [[0, 1], [1, 2], [2, 2], [3, 4], [4, 4]]; },
    render: function (s, p) {
      var sc = this.sc = scale([-0.6, 5.6], [-0.4, 5.2]), X = sc.x, Y = sc.y, P2 = s.pts, m = P2.length;
      var mx = 0, my = 0, sxx = 0, sxy = 0, sse = 0, worst = 0;
      P2.forEach(function (q) { mx += q[0] / m; my += q[1] / m; });
      P2.forEach(function (q) { sxx += (q[0] - mx) * (q[0] - mx); sxy += (q[0] - mx) * (q[1] - my); });
      var b1 = sxx > 1e-9 ? sxy / sxx : 0, b0 = my - b1 * mx;
      function yh(x) { return b0 + b1 * x; }

      p.axes(sc, { xticks: [1, 2, 3, 4, 5], yticks: [1, 2, 3, 4, 5], xlabel: "x", ylabel: "y" });

      var gq = p.g("squared-error", true);
      P2.forEach(function (q, i) {
        var r = q[1] - yh(q[0]);
        sse += r * r;
        if (Math.abs(r) > Math.abs(P2[worst][1] - yh(P2[worst][0]))) worst = i;
        p.rect(gq, X(q[0]), Y(q[1]), Math.abs(r) * sc.sy, Y(yh(q[0])) - Y(q[1]), "fill c-warm sq");
      });

      var gl = p.g("coefficients", true), ends = [[X(-0.6), Y(yh(-0.6))], [X(5.6), Y(yh(5.6))]];
      p.poly(gl, ends, "curve c-accent");
      p.poly(gl, ends, "hit");
      p.label("line", "\\hat y = \\hat\\beta_0 + \\hat\\beta_1 x", X(5.5), clamp(Y(yh(5.5)), 60, H - 60), b1 >= 0 ? "nw" : "sw", "coefficients");

      var gr = p.g("residuals");
      P2.forEach(function (q) {
        p.line(gr, X(q[0]), Y(q[1]), X(q[0]), Y(yh(q[0])), "curve c-warm");
        p.line(gr, X(q[0]), Y(q[1]), X(q[0]), Y(yh(q[0])), "hit");
      });
      var wq = P2[worst];
      if (Math.abs(wq[1] - yh(wq[0])) * sc.sy > 18)
        p.label("r", "r_i", X(wq[0]) - 4, (Y(wq[1]) + Y(yh(wq[0]))) / 2, "w", "residuals");

      var gp = p.g("predictions");
      P2.forEach(function (q) { p.circle(gp, X(q[0]), Y(yh(q[0])), 4.5, "hollow c-accent"); });

      var gd = p.g("data");
      P2.forEach(function (q) {
        p.circle(gd, X(q[0]), Y(q[1]), 6, "dot");
        p.circle(gd, X(q[0]), Y(q[1]), 16, "hitc");
      });

      return "intercept " + num(b0) + ", slope " + num(b1) +
        " &nbsp;·&nbsp; total squared error Σ<i>r<sub>i</sub></i><sup>2</sup> = " + num(sse, 3);
    },
    drag: function (s, pt, phase) {
      var sc = this.sc;
      if (phase === "start") {
        s.drag = -1;
        var best = 22;
        s.pts.forEach(function (q, i) {
          var d = Math.abs(pt.x - sc.x(q[0])) + Math.abs(pt.y - sc.y(q[1]));
          if (d < best) { best = d; s.drag = i; }
        });
        return s.drag >= 0;
      }
      s.pts[s.drag] = [clamp(sc.ix(pt.x), -0.4, 5.4), clamp(sc.iy(pt.y), -0.2, 5)];
    }
  };

  // High-dimensional geometry, one classical plot per chapter.
  var HD = {};
  HD.lgamma = function (z) {
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - HD.lgamma(1 - z);
    var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
      12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    z -= 1;
    var x = c[0], t = z + 7.5;
    for (var i = 1; i < 9; i++) x += c[i] / (z + i);
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  };
  // Regularized lower incomplete gamma P(a, x) (series, or continued fraction).
  HD.gammaP = function (a, x) {
    if (x <= 0) return 0;
    var lead = Math.exp(-x + a * Math.log(x) - HD.lgamma(a)), i;
    if (x < a + 1) {
      var ap = a, sum = 1 / a, del = sum;
      for (i = 0; i < 1000; i++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break; }
      return sum * lead;
    }
    var b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (i = 1; i < 1000; i++) {
      var an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      h *= d * c;
      if (Math.abs(d * c - 1) < 1e-14) break;
    }
    return 1 - lead * h;
  };
  HD.vol = function (n) { return Math.exp(n / 2 * Math.log(Math.PI) - HD.lgamma(n / 2 + 1)); };
  HD.rng = function (seed) {
    var spare = null;
    function u() {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return function () {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var r = Math.sqrt(-2 * Math.log(u() || 1e-12)), a = 2 * Math.PI * u();
      spare = r * Math.sin(a);
      return r * Math.cos(a);
    };
  };
  // JL experiment: N Gaussian points in R^M and one fixed Gaussian matrix G.
  // Projecting with the first n rows of G / √n gives Q; cum holds running
  // sums of (G_k · d)² so every n costs one lookup per pair.
  HD.JL = { M: 200, N: 30 };
  HD.jl = function () {
    var J = HD.JL;
    if (J.cum) return J;
    var rnd = HD.rng(11), M = J.M, N = J.N, i, j, k, l;
    var pts = [], G = [];
    for (i = 0; i < N; i++) { pts.push(new Float64Array(M)); for (l = 0; l < M; l++) pts[i][l] = rnd(); }
    for (k = 0; k < M; k++) { G.push(new Float64Array(M)); for (l = 0; l < M; l++) G[k][l] = rnd(); }
    J.pairs = N * (N - 1) / 2;
    J.cum = new Float64Array(J.pairs * (M + 1));
    J.len = new Float64Array(J.pairs);
    var p = 0, d = new Float64Array(M);
    for (i = 0; i < N; i++) for (j = i + 1; j < N; j++, p++) {
      var L = 0;
      for (l = 0; l < M; l++) { d[l] = pts[i][l] - pts[j][l]; L += d[l] * d[l]; }
      J.len[p] = L;
      var acc = 0, base = p * (M + 1);
      for (k = 0; k < M; k++) {
        var dot = 0, g = G[k];
        for (l = 0; l < M; l++) dot += g[l] * d[l];
        acc += dot * dot;
        J.cum[base + k + 1] = acc;
      }
    }
    return J;
  };

  function dimension(key, max, value) {
    return { key: key, label: "Dimension", min: 2, max: max, step: 1, value: value, show: function (v) { return "n = " + v; } };
  }
  function eps(key, min, max, value) {
    return { key: key, label: "Tolerance", min: min, max: max, step: 0.01, value: value, show: function (v) { return "ε = " + num(v); } };
  }
  HD.controls = {
    "corner-spheres": [dimension("nBox", 12, 2)],
    "ball-volume": [{ key: "nVol", label: "Dimension", min: 0, max: 20, step: 1, value: 3, show: function (v) { return "n = " + v; } }],
    shell: [dimension("nShell", 200, 20), eps("epsShell", 0.01, 0.5, 0.1)],
    "unit-norm": [dimension("nNorm", 300, 50), eps("epsNorm", 0.05, 0.9, 0.3)],
    orthogonal: [dimension("nAng", 400, 3), eps("epsAng", 0.05, 0.9, 0.2)],
    jl: [{ key: "nJL", label: "Target dim.", min: 2, max: 200, step: 1, value: 60, show: function (v) { return "n = " + v; } }, eps("epsJL", 0.1, 0.9, 0.5)]
  };

  // A density curve over [a, b], drawn and filled where keep(x) holds.
  function density(p, g, sc, xs, ys, keep) {
    var line = xs.map(function (x, i) { return [sc.x(x), sc.y(ys[i])]; });
    if (keep) {
      var run = [];
      xs.forEach(function (x, i) {
        if (keep(x)) run.push(i);
        if ((!keep(x) || i === xs.length - 1) && run.length > 1) {
          var poly = [[sc.x(xs[run[0]]), sc.y(0)]];
          run.forEach(function (j) { poly.push([sc.x(xs[j]), sc.y(ys[j])]); });
          poly.push([sc.x(xs[run[run.length - 1]]), sc.y(0)]);
          p.poly(g, poly, "fill c-warm", true);
        }
        if (!keep(x)) run = [];
      });
    }
    p.poly(g, line, "curve c-accent");
    p.poly(g, line, "hit");
  }

  specs["high-dimension"] = {
    alt: "Plots about high-dimensional space: spheres packed in a box, the volume of the unit ball by dimension, the radius distribution inside a ball, the length of a random Gaussian vector, the angle between two random vectors, and distances under a random projection.",
    story: true,
    controls: function (s) { return HD.controls[s.ch] || []; },
    hint: "Each chapter has its own plot. Raise the dimension and watch the mass concentrate.",
    init: function (s, thumb) {
      s.ch = thumb ? "corner-spheres" : "unit-norm";
      this.box = thumb ? { l: 12, r: 12, t: 12, b: 12 } : BOX;
      for (var c in HD.controls) HD.controls[c].forEach(function (o) { s[o.key] = o.value; });
      if (thumb) s.nBox = 10;
    },
    select: function (s, slug) {
      if (!slug || slug === s.ch || !HD.controls[slug]) return false;
      s.ch = slug;
      this.box = slug === "corner-spheres" ? { l: 12, r: 12, t: 12, b: 12 } : BOX;
      return true;
    },
    render: function (s, p) {
      this.box = s.ch === "corner-spheres" ? { l: 12, r: 12, t: 12, b: 12 } : BOX;
      return this[s.ch](s, p);
    },
    box: { l: 12, r: 12, t: 12, b: 12 },

    // 2^n unit spheres at the corners (±1, …, ±1) of the box [−2, 2]^n.
    "corner-spheres": function (s, p) {
      var sc = scale([-3.3, 3.3], [-2.155, 2.155], this.box), X = sc.x, Y = sc.y, n = s.nBox, r = Math.sqrt(n) - 1;
      var g = p.g(null, true);
      p.rect(g, X(-2), Y(2), 4 * sc.sx, 4 * sc.sy, "bar");
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c) {
        p.circle(g, X(c[0]), Y(c[1]), sc.sx, "fill c-muted");
        p.circle(g, X(c[0]), Y(c[1]), sc.sx, "curve thin c-muted");
      });
      p.circle(g, X(0), Y(0), Math.max(r, 0.005) * sc.sx, (r > 2 ? "fill c-warm" : "fill c-accent"));
      p.circle(g, X(0), Y(0), Math.max(r, 0.005) * sc.sx, "curve " + (r > 2 ? "c-warm" : "c-accent"));
      p.line(g, X(0), Y(0), X(1), Y(1), "curve thin c-muted dash");
      p.circle(g, X(1), Y(1), 3, "dot");
      p.circle(g, X(0), Y(0), 3, "dot");
      p.label("cs-d", "\\sqrt{n}", X(0.5), Y(0.5), "nw");
      p.label("cs-r", "r_n = \\sqrt{n} - 1", X(0), Math.min(Y(0) + Math.max(r, 0.3) * sc.sy + 4, Y(-2) - 34), "s");
      p.label("cs-box", "[-2, 2]^n", X(2), Y(-2), "nw");
      var fate = r < 1 ? "smaller than the corner spheres" : r === 1 ? "as large as the corner spheres" :
        r < 2 ? "larger than the corner spheres, still inside the box" : r === 2 ? "touching the faces of the box" : "poking out of the box";
      return "<i>n</i> = " + n + " &nbsp;·&nbsp; corner centers at distance √<i>n</i> = " + num(Math.sqrt(n), 3) +
        " &nbsp;·&nbsp; inner sphere radius " + num(r, 3) + ": " + fate;
    },

    // V_n = π^{n/2} / Γ(n/2 + 1) for n = 0 … 20.
    "ball-volume": function (s, p) {
      var sc = scale([-0.9, 20.9], [0, 6.1]), X = sc.x, Y = sc.y, n = s.nVol, k;
      var g = p.g(null);
      for (k = 0; k <= 20; k++) {
        var v = HD.vol(k);
        p.rect(g, X(k - 0.38), Y(v), 0.76 * sc.sx, Y(0) - Y(v), k === n ? "fill c-accent" : "bar");
        if (k === n) p.rect(g, X(k - 0.38), Y(v), 0.76 * sc.sx, Y(0) - Y(v), "curve thin c-accent");
      }
      p.axes(sc, { xticks: [0, 5, 10, 15, 20], yticks: [1, 2, 3, 4, 5, 6], xlabel: "n", ylabel: "V_n" });
      if (n >= 2) {
        var a = HD.vol(n - 2), b = HD.vol(n), top = Math.max(a, b) + 0.55;
        p.path(g, "M" + X(n - 2) + " " + Y(a + 0.1) + " C" + X(n - 2) + " " + Y(top) + " " + X(n) + " " + Y(top) + " " + X(n) + " " + Y(b + 0.18), "curve thin c-warm");
        p.label("bv-r" + n, "\\times \\tfrac{2\\pi}{" + n + "}", X(n - 1), (Y(a + 0.1) + Y(b + 0.18)) / 8 + 0.75 * Y(top) - 4, "n");
      }
      return "<i>V</i><sub>" + n + "</sub> = π<sup>" + n + "/2</sup> / Γ(" + n + "/2 + 1) = " + num(HD.vol(n), 4) +
        (n >= 2 ? " &nbsp;·&nbsp; = (2π/" + n + ") · <i>V</i><sub>" + (n - 2) + "</sub>" : "") + " &nbsp;·&nbsp; largest at <i>n</i> = 5";
    },

    // Radius of a uniform point in the unit n-ball: density n r^{n−1}.
    shell: function (s, p) {
      var n = s.nShell, e = s.epsShell, xs = [], ys = [], i;
      for (i = 0; i <= 400; i++) { var r = i / 400; xs.push(r); ys.push(n * Math.pow(r, n - 1)); }
      var sc = scale([-0.08, 1.12], [0, n * 1.15]);
      var g = p.g(null);
      density(p, g, sc, xs, ys, function (r) { return r >= 1 - e - 1e-9; });
      p.axes(sc, { xticks: [0.5, 1], xlabel: "r" });
      p.label("sh-f", "p(r) = n r^{n-1}", sc.x(1), sc.y(n), "w");
      p.label("sh-e", "1 - \\varepsilon", sc.x(1 - e), sc.y(0) + 4, "s");
      var frac = 1 - Math.pow(1 - e, n);
      return "share of the volume within ε = " + num(e) + " of the surface: 1 − (1 − ε)<sup><i>n</i></sup> = " + num(100 * frac, 1) + "%";
    },

    // ‖u‖² for u ~ N(0, I/n): n‖u‖² is χ²(n).
    "unit-norm": function (s, p) {
      var n = s.nNorm, e = s.epsNorm, xs = [], ys = [], i, top = 0;
      var lc = -n / 2 * Math.log(2) - HD.lgamma(n / 2) + Math.log(n);
      for (i = 1; i <= 500; i++) {
        var x = i / 500 * 2.6, y = n * x, f = Math.exp(lc + (n / 2 - 1) * Math.log(y) - y / 2);
        xs.push(x); ys.push(f); top = Math.max(top, f);
      }
      top = Math.min(Math.max(top, 1.2), 12);
      var sc = scale([-0.15, 2.75], [0, top * 1.15]);
      var g = p.g(null, true);
      density(p, g, sc, xs, ys.map(function (v) { return Math.min(v, top * 1.2); }), function (x) { return Math.abs(x - 1) >= e; });
      p.axes(sc, { xticks: [1, 2], xlabel: "\\lVert u \\rVert^2" });
      p.line(p.g(null), sc.x(1), sc.y(0), sc.x(1), sc.y(top * 1.1), "curve thin c-muted dash");
      p.label("un-l", "1 - \\varepsilon", sc.x(1 - e), sc.y(0) + 4, "s");
      p.label("un-r", "1 + \\varepsilon", sc.x(1 + e), sc.y(0) + 4, "s");
      var tail = HD.gammaP(n / 2, n * (1 - e) / 2) + 1 - HD.gammaP(n / 2, n * (1 + e) / 2);
      var bound = 2 * Math.exp(-n * e * e / 8);
      return "P(|‖<i>u</i>‖² − 1| ≥ ε) = " + sci(Math.max(tail, 1e-300)) + " &nbsp;·&nbsp; Chernoff bound 2e<sup>−<i>n</i>ε²/8</sup> = " +
        (bound >= 1 ? num(bound, 3) + " (no information yet)" : sci(bound));
    },

    // Angle between two independent uniform directions: density ∝ sin^{n−2} θ.
    orthogonal: function (s, p) {
      var n = s.nAng, e = s.epsAng, N = 720, xs = [], ys = [], i, Z = 0, out = 0, top = 0;
      for (i = 0; i <= N; i++) {
        var t = i / N * Math.PI, w = n === 2 ? 1 : Math.exp((n - 2) * Math.log(Math.max(Math.sin(t), 1e-300)));
        xs.push(t * 180 / Math.PI); ys.push(w); Z += w;
        if (Math.abs(Math.cos(t)) >= e) out += w;
      }
      ys = ys.map(function (w) { var v = w / (Z * 0.25); top = Math.max(top, v); return v; });
      var sc = scale([-12, 196], [0, top * 1.18]);
      var g = p.g(null, true), lo = Math.acos(e) * 180 / Math.PI;
      density(p, g, sc, xs, ys, function (d) { return d <= lo || d >= 180 - lo; });
      p.axes(sc, { xticks: [0, 45, 90, 135, 180], xlabel: "\\theta^\\circ" });
      p.line(g, sc.x(lo), sc.y(0), sc.x(lo), sc.y(top * 1.08), "curve thin c-muted dash");
      p.label("or-l", "\\cos\\theta = \\varepsilon", sc.x(lo), sc.y(top * 1.08), "nw");
      return "P(|cos θ| ≥ ε) = " + sci(Math.max(out / Z, 1e-300)) + " &nbsp;·&nbsp; Gaussian bound 4e<sup>−<i>n</i>ε²/8</sup> = " +
        (4 * Math.exp(-n * e * e / 8) >= 1 ? num(4 * Math.exp(-n * e * e / 8), 2) + " (no information yet)" : sci(4 * Math.exp(-n * e * e / 8)));
    },

    // Squared-distance ratios ‖Q(v_i − v_j)‖² / ‖v_i − v_j‖² after a random projection.
    jl: function (s, p) {
      var J = HD.jl(), n = s.nJL, e = s.epsJL, B = 52, w = 0.05, bins = [], i, inside = 0, worst = 0;
      for (i = 0; i < B; i++) bins.push(0);
      for (var q = 0; q < J.pairs; q++) {
        var ratio = J.cum[q * (J.M + 1) + n] / n / J.len[q];
        bins[Math.min(B - 1, Math.floor(ratio / w))]++;
        if (Math.abs(ratio - 1) <= e) inside++;
        worst = Math.max(worst, Math.abs(ratio - 1));
      }
      var hmax = Math.max.apply(null, bins), sc = scale([-0.12, 2.72], [0, hmax * 1.18]);
      var gb = p.g(null);
      p.rect(gb, sc.x(1 - e), sc.y(hmax * 1.15), (2 * e) * sc.sx, sc.y(0) - sc.y(hmax * 1.15), "fill c-warm");
      bins.forEach(function (c, k) { if (c) p.rect(gb, sc.x(k * w), sc.y(c), w * sc.sx, sc.y(0) - sc.y(c), "fill c-accent"); });
      bins.forEach(function (c, k) { if (c) p.rect(gb, sc.x(k * w), sc.y(c), w * sc.sx, sc.y(0) - sc.y(c), "curve thin c-accent"); });
      p.axes(sc, { xticks: [1, 2], xlabel: "\\frac{\\lVert Qv_i - Qv_j \\rVert^2}{\\lVert v_i - v_j \\rVert^2}" });
      p.label("jl-l", "1 - \\varepsilon", sc.x(1 - e), sc.y(0) + 4, "s");
      p.label("jl-r", "1 + \\varepsilon", sc.x(1 + e), sc.y(0) + 4, "s");
      var need = Math.ceil(24 * Math.log(J.N) / (e * e));
      return J.pairs + " pairs of " + J.N + " points in ℝ<sup>" + J.M + "</sup> projected to ℝ<sup>" + n + "</sup> &nbsp;·&nbsp; " + inside + " within 1 ± ε, worst distortion " +
        num(worst, 2) + " &nbsp;·&nbsp; the lemma guarantees all of them once <i>n</i> ≥ 24 ln <i>N</i>/ε² = " + need;
    }
  };

  window.Figures = { specs: specs, mount: mount };
})();
