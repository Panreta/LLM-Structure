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
    var state = {}, current = null, drawn = false;
    (spec.controls || []).forEach(function (c) { state[c.key] = c.value; });
    if (spec.init) spec.init(state);

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
      if (spec.controls) wrap.appendChild(controls());
      readout = div("fig-readout");
      readout.setAttribute("aria-live", "polite");
      wrap.appendChild(readout);
      if (spec.hint) wrap.appendChild(div("fig-hint", spec.hint));
      pointer();
    }
    host.appendChild(wrap);
    draw();

    function draw() {
      while (svg.lastChild) svg.removeChild(svg.lastChild);
      var cp = mk("clipPath", { id: id }, mk("defs", {}, svg));
      mk("rect", { x: box.l, y: box.t, width: W - box.l - box.r, height: H - box.t - box.b }, cp);
      var p = new Painter(svg, labels, opts, id);
      var out = spec.render.call(spec, state, p) || "";
      Array.prototype.forEach.call(labels.children, function (e) {
        if (!p.seen[e.getAttribute("data-key")]) e.hidden = true;
      });
      if (readout) readout.innerHTML = out;
      if (drawn && p.fresh.length && opts.typeset) opts.typeset(labels);
      drawn = true;
      highlight(current);
    }

    function controls() {
      var box = div("fig-controls");
      spec.controls.forEach(function (c) {
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
        input.min = c.min; input.max = c.max; input.step = c.step; input.value = c.value;
        var out = document.createElement("output");
        out.textContent = c.show(c.value);
        input.addEventListener("input", function () {
          state[c.key] = parseFloat(input.value);
          out.textContent = c.show(state[c.key]);
          draw();
        });
        lab.appendChild(input);
        lab.appendChild(out);
        box.appendChild(lab);
      });
      return box;
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

    function highlight(slug) {
      current = slug;
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

  // Gradient descent on f(x) = ½(x₁² + 6x₂²).
  specs["gradient-descent"] = {
    alt: "Contour lines of an elongated bowl with the zigzag path of gradient descent from a start point toward the minimum.",
    box: { l: 12, r: 12, t: 12, b: 12 },
    controls: [
      { key: "eta", label: "Learning rate", min: 0.02, max: 0.36, step: 0.01, value: 0.25, show: function (v) { return "η = " + v.toFixed(2); } },
      { key: "T", label: "Steps", min: 1, max: 40, step: 1, value: 12, show: function (v) { return "T = " + v; } }
    ],
    hint: "Tap empty space to move the start. Past η = 1/6 the path zigzags; past η = 1/3 it diverges.",
    init: function (s) { s.x0 = [-2.4, 0.9]; },
    render: function (s, p) {
      var sc = this.sc = scale([-3.3, 3.3], [-2.155, 2.155], this.box), X = sc.x, Y = sc.y, k;
      function f(v) { return (v[0] * v[0] + 6 * v[1] * v[1]) / 2; }

      var go = p.g("objective", true);
      [0.25, 1, 2.25, 4, 6.25, 9, 12.25, 16, 20.25].forEach(function (c) {
        p.ellipse(go, X(0), Y(0), Math.sqrt(2 * c) * sc.sx, Math.sqrt(c / 3) * sc.sy, "contour");
      });

      var gm = p.g("minimizer");
      p.line(gm, X(0) - 7, Y(0), X(0) + 7, Y(0), "curve");
      p.line(gm, X(0), Y(0) - 7, X(0), Y(0) + 7, "curve");
      p.circle(gm, X(0), Y(0), 14, "hitc");
      p.label("xs", "\\mathbf{x}^\\star", X(0) + 6, Y(0) + 4, "se", "minimizer");

      var xs = [s.x0];
      for (k = 0; k < s.T; k++) {
        var v = xs[k];
        if (Math.abs(v[0]) + Math.abs(v[1]) > 1e3) break;
        xs.push([v[0] - s.eta * v[0], v[1] - s.eta * 6 * v[1]]);
      }
      var pts = xs.map(function (v) { return [X(v[0]), Y(v[1])]; });
      var gs = p.g("step", true);
      p.poly(gs, pts, "curve c-accent");
      p.poly(gs, pts, "hit");
      var gi = p.g("iterate", true);
      for (k = 1; k < pts.length; k++) p.circle(gi, pts[k][0], pts[k][1], 4, "dot c-accent");
      var last = xs[xs.length - 1];
      if (Math.abs(last[0]) < 3.2 && Math.abs(last[1]) < 2.05 && xs.length > 1)
        p.label("xT", "\\mathbf{x}_T", pts[pts.length - 1][0], pts[pts.length - 1][1], "ne", "iterate");

      var g = [s.x0[0], 6 * s.x0[1]], gl = Math.sqrt(g[0] * g[0] + g[1] * g[1]);
      if (gl > 1e-6) {
        var tip = [s.x0[0] + 0.7 * g[0] / gl, s.x0[1] + 0.7 * g[1] / gl];
        var gg = p.g("gradient");
        p.arrow(gg, X(s.x0[0]), Y(s.x0[1]), X(tip[0]), Y(tip[1]), "c-warm");
        p.line(gg, X(s.x0[0]), Y(s.x0[1]), X(tip[0]), Y(tip[1]), "hit");
        p.label("grad", "\\nabla f(\\mathbf{x}_0)", X(tip[0]), Y(tip[1]), X(tip[0]) < W / 2 ? "e" : "w", "gradient");
      }
      var g0 = p.g("start");
      p.circle(g0, X(s.x0[0]), Y(s.x0[1]), 6, "dot");
      p.circle(g0, X(s.x0[0]), Y(s.x0[1]), 14, "hitc");
      p.label("x0", "\\mathbf{x}_0", X(s.x0[0]), Y(s.x0[1]) + (g[1] > 0 ? 8 : -8), g[1] > 0 ? "s" : "n", "start");

      var fate = s.eta < 1 / 6 ? "goes straight down the valley" :
        s.eta < 1 / 3 ? "zigzags across the valley but converges" : "diverges, since η > 2/L = 1/3";
      return "η = " + num(s.eta) + " &nbsp;·&nbsp; <i>f</i>(<b>x</b><sub><i>T</i></sub>) = " +
        (f(last) < 1e4 ? num(f(last), 4) : "∞") + " &nbsp;·&nbsp; the path " + fate;
    },
    click: function (s, pt) {
      var sc = this.sc;
      s.x0 = [clamp(sc.ix(pt.x), -3.2, 3.2), clamp(sc.iy(pt.y), -2.05, 2.05)];
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

  window.Figures = { specs: specs, mount: mount };
})();
