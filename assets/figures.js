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
  // Large SVG text, drawn even in thumbnails (for covers).
  P.big = function (g, x, y, s, size, cls, anchor) {
    var t = mk("text", { x: x, y: y, "class": "big " + (cls || ""), "text-anchor": anchor || "middle", "font-size": size }, g);
    t.textContent = s;
    return t;
  };
  P.text = function (g, x, y, s, anchor) {
    if (this.thumb) return;
    mk("text", { x: x, y: y, "class": "tick-text", "text-anchor": anchor || "middle" }, g).textContent = s;
  };
  // A MathJax label laid over the SVG. pos says which side of (x, y) it sits on.
  P.label = function (key, tex, x, y, pos, part) {
    if (this.thumb) return;
    this.seen[key] = true;
    var e = this.labels.querySelector('[data-key="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]');
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
    if (o.xlabel) this.label("xlabel " + o.xlabel, o.xlabel, W - 6, ay + 6, "sw");
    if (o.ylabel) this.label("ylabel " + o.ylabel, o.ylabel, ax + 8, 4, "se");
  };

  // ---------- mount: one figure with its controls ----------
  function mount(host, name, opts) {
    var spec = specs[name];
    opts = opts || {};
    var state = {}, current = null, drawn = false, ctlBox = null, ctlSig = null, anim = false, lastT = 0;
    function loop(ts) {
      if (!spec.animating(state) || !stage.isConnected || !stage.offsetParent) { anim = false; return; }
      var dt = lastT ? Math.min((ts - lastT) / 1000, 0.05) : 0;
      lastT = ts;
      spec.step(state, dt);
      draw();
      requestAnimationFrame(loop);
    }
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
      var out = (opts.thumb && spec.cover ? spec.cover.call(spec, p) : spec.render.call(spec, state, p)) || "";
      var desc = !opts.thumb && spec.describe && spec.describe.call(spec, state);
      if (desc) out = "<span class=\"fig-desc\">" + desc + "</span>" + out;
      Array.prototype.forEach.call(labels.children, function (e) {
        if (!p.seen[e.getAttribute("data-key")]) e.hidden = true;
      });
      if (readout) readout.innerHTML = out;
      if (ctlBox) controls();
      if (drawn && p.fresh.length && opts.typeset) opts.typeset(labels);
      drawn = true;
      // Animated figures: spec.animating(state) says whether to keep going,
      // spec.step(state, dt) advances time. Stops when the figure is hidden.
      if (!opts.thumb && spec.animating && spec.animating(state) && !anim) { anim = true; lastT = 0; requestAnimationFrame(loop); }
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
      p.label("Sn", "\\text{bars: } S_n = \\textstyle\\sum_i f(x_i^*)\\,\\Delta x", X(0.03), Y(1.08), "se", "riemann-sum");
      p.label("A", "\\text{shaded: } \\int_0^1 x^2\\,dx = \\tfrac13", X(0.03), Y(0.95), "se", "integral");

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
      var e2 = M([-Math.SQRT1_2, Math.SQRT1_2]);
      p.label("ell", "A_t(\\text{unit circle})", X(e2[0]) - 4, Y(e2[1]) - 4, "nw", "image");
      p.label("circ", "\\lVert \\mathbf{x} \\rVert = 1", X(-0.94) - 4, Y(-0.34), "w");

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
      p.label("po" + s.h + "-" + s.t, "p(\\theta \\mid x) = \\text{Beta}(" + (s.h + 2) + ", " + (s.t + 2) + ")", X(ip / N), Y(po[ip]), right ? "nw" : "ne", "posterior");
      p.label("lk" + s.h + "-" + s.t, "p(x \\mid \\theta) \\propto \\theta^{" + s.h + "}(1-\\theta)^{" + s.t + "}", X(il / N) + (right ? 12 : -12), Y(lk[il]) + 4, right ? "e" : "w", "likelihood");
      p.label("pr", "p(\\theta) = \\text{Beta}(2, 2)", X(ir / N), Y(pr[ir]), right ? "nw" : "ne", "prior");

      return s.h + " heads, " + s.t + " tails &nbsp;·&nbsp; evidence <i>p</i>(<i>x</i>) = " + sci(ZJ) +
        " &nbsp;·&nbsp; posterior Beta(" + (s.h + 2) + ", " + (s.t + 2) + "), mean " + num((s.h + 2) / (s.h + s.t + 4), 3);
    }
  };

  // From gradient descent to Muon, one optimizer per block, on the valley
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
    hint: "Each block swaps in a new optimizer; the dashed path is the one it improves on. Tap empty space to move the start.",
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
      p.label("gd-f", "f(\\mathbf{x}) = \\tfrac12(x_1 - 1.2)^2 + \\tfrac{25}{2}(x_2 - 0.4)^2", X(-2.7), Y(2.3), "se", "objective");

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
      if (xs) {
        trail(opt, xs, true);
        var mk2 = xs[Math.min(xs.length - 1, 2)];
        if (Math.abs(mk2[0]) < 3 && Math.abs(mk2[1]) < 2.5) p.label("main-" + opt, GD.tex[opt], X(mk2[0]) + 8, Y(mk2[1]) + 6, "se", opt);
      }

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
        p.label("r", "r_i = y_i - \\hat y_i", X(wq[0]) - 4, (Y(wq[1]) + Y(yh(wq[0]))) / 2, "w", "residuals");
      var wr = Math.abs(wq[1] - yh(wq[0])) * sc.sy;
      if (wr > 34) p.label("sq", "r_i^2", X(wq[0]) + wr / 2, (Y(wq[1]) + Y(yh(wq[0]))) / 2, "c", "squared-error");

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

  // High-dimensional geometry, one classical plot per block.
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
    hint: "Each block has its own plot. Raise the dimension and watch the mass concentrate.",
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
        p.label("bv-f", "V_n = \\pi^{n/2} / \\Gamma(\\tfrac n2 + 1)", X(20.5), Y(5.6), "sw");
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
      p.label("un-f", "\\text{density of } \\lVert u \\rVert^2, \\ n\\lVert u \\rVert^2 \\sim \\chi^2_n", sc.x(1.45), sc.y(top * 0.8), "e");
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
      p.label("or-f", "p(\\theta) \\propto \\sin^{n-2}\\theta", sc.x(180 - lo) + 8, sc.y(top * 0.9), "e");
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

  // From MDPs through TRPO and PPO to GRPO. Most blocks use one running
  // example small enough to solve exactly: states A and B, actions "stay"
  // and "move", and one policy parameter θ with π(move | s) = σ(θ).
  var RL = { R: [[0, -0.1], [1, 0]] };
  RL.sig = function (t) { return 1 / (1 + Math.exp(-t)); };
  RL.solve = function (th, g) {
    var p = RL.sig(th), R = RL.R;
    var r = [(1 - p) * R[0][0] + p * R[0][1], (1 - p) * R[1][0] + p * R[1][1]];
    var a = 1 - g * (1 - p), b = -g * p, det = a * a - b * b;
    var V = [(a * r[0] - b * r[1]) / det, (-b * r[0] + a * r[1]) / det];
    var Q = [[R[0][0] + g * V[0], R[0][1] + g * V[1]], [R[1][0] + g * V[1], R[1][1] + g * V[0]]];
    return {
      p: p, V: V, J: V[0],
      A: [[Q[0][0] - V[0], Q[0][1] - V[0]], [Q[1][0] - V[1], Q[1][1] - V[1]]],
      d: [(1 - g) * a / det, -(1 - g) * b / det]
    };
  };
  // Surrogate L_θ(θ′) and the average KL(π_θ ‖ π_θ′) (same in both states).
  RL.L = function (S, g, th2) {
    var q = RL.sig(th2), v = S.J;
    for (var i = 0; i < 2; i++) v += S.d[i] * ((1 - q) * S.A[i][0] + q * S.A[i][1]) / (1 - g);
    return v;
  };
  RL.KL = function (th, th2) {
    var p = RL.sig(th), q = RL.sig(th2);
    return p * Math.log(p / q) + (1 - p) * Math.log((1 - p) / (1 - q));
  };
  // TRPO's step in one dimension: g = L′, H = Fisher information p(1 − p).
  RL.trpo = function (S, g, th, delta) {
    var grad = 0, H = S.p * (1 - S.p);
    for (var i = 0; i < 2; i++) grad += S.d[i] * H * (S.A[i][1] - S.A[i][0]) / (1 - g);
    return { g: grad, H: H, step: Math.sqrt(2 * delta / H) * (grad >= 0 ? 1 : -1) };
  };
  RL.X = [-6, 2.5];
  RL.region = function (th, delta) {
    var lo = th, hi = th;
    while (lo > RL.X[0] && RL.KL(th, lo - 0.01) <= delta) lo -= 0.01;
    while (hi < RL.X[1] && RL.KL(th, hi + 0.01) <= delta) hi += 0.01;
    return [lo, hi];
  };
  RL.uniform = function (seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  // Curved arrow: cubic Bézier with an arrowhead along its final tangent.
  RL.bend = function (p, g, a, c1, c2, b, cls) {
    p.path(g, "M" + a[0] + " " + a[1] + " C" + c1[0] + " " + c1[1] + " " + c2[0] + " " + c2[1] + " " + b[0] + " " + b[1], "curve thin " + cls);
    var dx = b[0] - c2[0], dy = b[1] - c2[1], L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L, s = 11, w = 4.6;
    p.poly(g, [b, [b[0] - ux * s - uy * w, b[1] - uy * s + ux * w], [b[0] - ux * s + uy * w, b[1] - uy * s - ux * w]], "head " + cls, true);
  };

  var TH = { key: "th", label: "Policy θ", min: -6, max: 2, step: 0.05, value: -4, show: function (v) { return "θ = " + num(v) + ", p = " + num(RL.sig(v), 3); } };
  var GAM = { key: "gamma", label: "Discount", min: 0.5, max: 0.98, step: 0.01, value: 0.9, show: function (v) { return "γ = " + num(v); } };
  var DEL = { key: "delta", label: "Trust region", min: 0.02, max: 1, step: 0.01, value: 0.2, show: function (v) { return "δ = " + num(v); } };
  RL.controls = {
    introduction: [
      { key: "G", label: "Group size", min: 2, max: 16, step: 1, value: 8, show: function (v) { return "G = " + v; } },
      { key: "acc", label: "Success rate", min: 0, max: 1, step: 0.05, value: 0.4, show: function (v) { return num(100 * v, 0) + "%"; } }
    ],
    preliminaries: [TH, GAM],
    "build-the-model": [TH, GAM],
    "is-it-solvable": [TH, DEL],
    trpo: [{ key: "dTR", label: "Trust region", min: 0.1, max: 1.5, step: 0.05, value: 0.6, show: function (v) { return "δ = " + num(v); } }],
    "conjugate-gradient": [],
    "line-search": [TH, DEL],
    ppo: [TH, DEL],
    "ppo-penalty": [TH, { key: "lb", label: "Penalty", min: -1, max: 3, step: 0.05, value: 1.7, show: function (v) { var b = Math.pow(10, v); return "β = " + (b < 10 ? num(b, 2) : num(b, 0)); } }, DEL],
    "ppo-clip": [
      { key: "sgn", label: "Advantage", type: "choice", value: 1, options: [[1, "Â > 0"], [-1, "Â < 0"]] },
      { key: "eps", label: "Clip range", min: 0.05, max: 0.5, step: 0.01, value: 0.2, show: function (v) { return "ε = " + num(v); } }
    ]
  };
  RL.wide = { trpo: 1, "conjugate-gradient": 1, preliminaries: 1 };
  RL.hints = {
    introduction: "Tap empty space to sample a new group of answers.",
    trpo: "Drag the tip of the brown gradient g.",
    "conjugate-gradient": "Drag the start x₀.",
    "ppo-clip": "Switch the sign of the advantage."
  };

  // The θ′ axis shared by the trust-region blocks: J, L and the region.
  function policyAxis(s, p, opts) {
    var g = s.gamma, S = RL.solve(s.th, g), xs = [], Js = [], Ls = [], i;
    for (i = 0; i <= 340; i++) {
      var t = RL.X[0] + (RL.X[1] - RL.X[0]) * i / 340;
      xs.push(t); Js.push(RL.solve(t, g).J); Ls.push(RL.L(S, g, t));
    }
    var jmin = Math.min.apply(null, Js), jmax = Math.max.apply(null, Js), pad = (jmax - jmin) * 0.12;
    var sc = scale([RL.X[0] - 0.35, RL.X[1] + 0.15], [jmin - pad, jmax + (jmax - jmin) * 0.55]);
    var top = sc.yd[1], X = sc.x, Y = sc.y;
    if (opts.region) {
      var rg = RL.region(s.th, s.delta), gr = p.g(null);
      p.rect(gr, X(rg[0]), Y(top), X(rg[1]) - X(rg[0]), Y(sc.yd[0]) - Y(top), "fill c-muted");
      p.label("rl-tr", "\\text{KL} \\le \\delta", (X(rg[0]) + X(rg[1])) / 2, Y(top) + 4, "s");
    }
    p.axes(sc, { xticks: [-6, -4, -2, 0, 2], xlabel: "\\theta'" });
    var gc = p.g(null, true);
    var line = function (ys) { return xs.map(function (x, k) { return [X(x), Y(Math.min(Math.max(ys[k], sc.yd[0] - 1), top + 1))]; }); };
    p.poly(gc, line(Js), "curve");
    if (opts.L) p.poly(gc, line(Ls), "curve c-accent");
    if (opts.extra) p.poly(gc, line(xs.map(opts.extra)), "curve c-warm");
    var jx = RL.X[0] + 0.15;
    p.label("rl-J", "J(\\theta')", X(jx), Y(RL.solve(jx, g).J) - 4, "ne");
    if (opts.L) {
      var lx = s.th + 1.1 < RL.X[1] ? s.th + 1.1 : s.th - 1.1;
      if (RL.L(S, g, lx) < top) p.label("rl-L", "L_\\theta(\\theta')", X(lx), Y(RL.L(S, g, lx)), "nw");
    }
    var gm = p.g(null);
    p.line(gm, X(s.th), Y(sc.yd[0]), X(s.th), Y(S.J), "curve thin c-muted dash");
    p.circle(gm, X(s.th), Y(S.J), 5.5, "dot");
    p.label("rl-th", "\\theta", X(s.th), Y(sc.yd[0]) - 4, "n");
    return { sc: sc, S: S, xs: xs, Js: Js, Ls: Ls };
  }

  specs.grpo = {
    alt: "Figures for the derivation of GRPO: a group of sampled answers with normalized advantages, a two-state Markov decision process, its discounted state visitation, the surrogate objective inside a trust region, TRPO's ellipse, conjugate gradient, line search, PPO's penalty, and the clipped objective.",
    story: true,
    controls: function (s) { return RL.controls[s.ch] || []; },
    init: function (s) {
      s.ch = "introduction";
      for (var c in RL.controls) RL.controls[c].forEach(function (o) { s[o.key] = o.value; });
      s.seed = 3;
      s.gTR = [1.8, -0.6];
      s.x0 = [-2.6, -1.2];
      this.box = BOX;
    },
    select: function (s, slug) {
      if (!slug || slug === s.ch || !RL.controls[slug]) return false;
      s.ch = slug;
      this.box = RL.wide[slug] ? { l: 12, r: 12, t: 12, b: 12 } : BOX;
      return true;
    },
    render: function (s, p) {
      var out = this[s.ch](s, p) || "";
      return out + (RL.hints[s.ch] ? "<br><span class=\"muted\">" + RL.hints[s.ch] + "</span>" : "");
    },
    click: function (s, pt) {
      if (s.ch !== "introduction") return false;
      s.seed++;
      return true;
    },
    drag: function (s, pt, phase) {
      var sc = this.sc;
      if (!sc || (s.ch !== "trpo" && s.ch !== "conjugate-gradient")) return false;
      var v = s.ch === "trpo" ? s.gTR : s.x0;
      if (phase === "start") return Math.abs(pt.x - sc.x(v[0])) + Math.abs(pt.y - sc.y(v[1])) < 28;
      var nv = [clamp(sc.ix(pt.x), -3.1, 3.1), clamp(sc.iy(pt.y), -2, 2)];
      if (s.ch === "trpo") s.gTR = nv; else s.x0 = nv;
    },

    // GRPO's group: G answers to one question, rewards, normalized advantages.
    introduction: function (s, p) {
      var u = RL.uniform(1000 * s.seed + 7), G = s.G, r = [], i, mean = 0, sd = 0;
      for (i = 0; i < 16; i++) r.push(u() < s.acc ? 1 : 0);
      r = r.slice(0, G);
      r.forEach(function (v) { mean += v / G; });
      r.forEach(function (v) { sd += (v - mean) * (v - mean) / G; });
      sd = Math.sqrt(sd);
      var A = r.map(function (v) { return sd > 1e-9 ? (v - mean) / sd : 0; });
      var sc = scale([-0.2, G + 0.4], [-3.4, 3.4]), X = sc.x, Y = sc.y;
      p.axes(sc, { yticks: [-2, -1, 1, 2], ylabel: "\\hat A_i" });
      var g = p.g(null);
      A.forEach(function (a, k) {
        var x = k + 0.6;
        if (Math.abs(a) > 1e-9) p.rect(g, X(x - 0.32), Y(Math.max(a, 0)), 0.64 * sc.sx, Math.abs(a) * sc.sy, "fill " + (a > 0 ? "c-accent" : "c-warm"));
        if (Math.abs(a) > 1e-9) p.rect(g, X(x - 0.32), Y(Math.max(a, 0)), 0.64 * sc.sx, Math.abs(a) * sc.sy, "curve thin " + (a > 0 ? "c-accent" : "c-warm"));
        p.circle(g, X(x), Y(3.05), 6, r[k] ? "dot c-accent" : "hollow c-muted");
        p.text(g, X(x), Y(0) + (a > 0 ? 18 : -8), "o" + (k + 1));
      });
      p.label("in-r", "r_i", X(G + 0.15), Y(3.05), "e");
      p.label("in-A", "\\hat A_i = \\frac{r_i - \\operatorname{mean}(r)}{\\operatorname{std}(r)}", X(0.15), Y(-2.5), "e");
      var right = r.filter(function (v) { return v; }).length;
      return right + " of " + G + " answers correct &nbsp;·&nbsp; mean reward " + num(mean) + ", std " + num(sd) + " &nbsp;·&nbsp; " +
        (sd > 1e-9 ? "correct answers get Â = " + signed((1 - mean) / sd) + ", wrong ones " + signed(-mean / sd) :
          "every answer got the same reward, so every advantage is 0 and this question teaches nothing");
    },

    // The running example drawn as a state diagram.
    preliminaries: function (s, p) {
      var g = s.gamma, S = RL.solve(s.th, g), P = S.p, A = [215, 190], B = [385, 190], rad = 46;
      var gd = p.g(null);
      [[A, "A"], [B, "B"]].forEach(function (n) { p.circle(gd, n[0][0], n[0][1], rad, "hollow c-muted"); });
      RL.bend(p, gd, [A[0] + 33, A[1] - 33], [275, 85], [325, 85], [B[0] - 33, B[1] - 33], "c-accent");
      RL.bend(p, gd, [B[0] - 33, B[1] + 33], [325, 295], [275, 295], [A[0] + 33, A[1] + 33], "c-accent");
      RL.bend(p, gd, [A[0] - 40, A[1] - 24], [95, 110], [95, 270], [A[0] - 40, A[1] + 24], "c-muted");
      RL.bend(p, gd, [B[0] + 40, B[1] - 24], [505, 110], [505, 270], [B[0] + 40, B[1] + 24], "c-muted");
      p.label("pr-A", "A", A[0], A[1] - 14, "c");
      p.label("pr-B", "B", B[0], B[1] - 14, "c");
      p.label("pr-VA" + S.V[0].toFixed(2), "V = " + num(S.V[0]).replace("−", "-"), A[0], A[1] + 14, "c");
      p.label("pr-VB" + S.V[1].toFixed(2), "V = " + num(S.V[1]).replace("−", "-"), B[0], B[1] + 14, "c");
      p.label("pr-m1", "\\text{move: } p,\\ r = -0.1", 300, 96, "n");
      p.label("pr-m2", "\\text{move: } p,\\ r = 0", 300, 286, "s");
      p.label("pr-s1", "\\text{stay: } 1-p,\\ r = 0", 130, 262, "s");
      p.label("pr-s2", "\\text{stay: } 1-p,\\ r = 1", 470, 262, "s");
      p.label("pr-st", "\\text{start}", A[0], A[1] + rad + 6, "s");
      return "π(move | <i>s</i>) = <i>p</i> = σ(θ) = " + num(P, 3) + " &nbsp;·&nbsp; <i>V</i><sup>π</sup>(A) = " + num(S.V[0], 3) +
        ", <i>V</i><sup>π</sup>(B) = " + num(S.V[1], 3) + " &nbsp;·&nbsp; a reward at step <i>k</i> counts γ<sup><i>k</i></sup> = " + num(g) + "<sup><i>k</i></sup>";
    },

    // Discounted state visitation: bars (1 − γ)γ^t P_t(s), split by state.
    "build-the-model": function (s, p) {
      var g = s.gamma, P = RL.sig(s.th), T = 40, pa = 1, t, dB = 0;
      var sc = scale([-1.5, T + 1], [0, (1 - g) * 1.25]), X = sc.x, Y = sc.y, gb = p.g(null);
      for (t = 0; t <= T; t++) {
        var w = (1 - g) * Math.pow(g, t), hb = w * (1 - pa);
        dB += hb;
        p.rect(gb, X(t - 0.4), Y(w), 0.8 * sc.sx, (w - hb) * sc.sy, "bar");
        p.rect(gb, X(t - 0.4), Y(hb), 0.8 * sc.sx, hb * sc.sy, "fill c-accent");
        pa = pa * (1 - P) + (1 - pa) * P;
      }
      for (t = T + 1; t < 2000; t++) { dB += (1 - g) * Math.pow(g, t) * (1 - pa); pa = pa * (1 - P) + (1 - pa) * P; }
      p.axes(sc, { xticks: [0, 10, 20, 30, 40], xlabel: "t" });
      p.label("bm-w", "(1-\\gamma)\\gamma^t", X(1.2), Y(1 - g) - 2, "ne");
      p.label("bm-k", "\\text{blue: in B} \\quad \\text{gray: in A}", X(T), Y((1 - g) * 1.15), "w");
      return "visitation 𝒱<sup>π</sup>(A) = " + num(1 - dB, 3) + ", 𝒱<sup>π</sup>(B) = " + num(dB, 3) +
        " &nbsp;·&nbsp; the bars sum to 1 &nbsp;·&nbsp; <i>J</i>(θ) = " + num(RL.solve(s.th, g).J, 3) + " = Σ<sub><i>s</i></sub> 𝒱(<i>s</i>) <i>r</i><sup>π</sup>(<i>s</i>) / (1 − γ)";
    },

    "is-it-solvable": function (s, p) {
      var ax = policyAxis(s, p, { L: true, region: true }), sc = ax.sc, rg = RL.region(s.th, s.delta), best = s.th, i;
      for (i = 0; i <= 200; i++) { var t = rg[0] + (rg[1] - rg[0]) * i / 200; if (RL.L(ax.S, s.gamma, t) > RL.L(ax.S, s.gamma, best)) best = t; }
      var gb = p.g(null), Lb = RL.L(ax.S, s.gamma, best), Jb = RL.solve(best, s.gamma).J;
      p.circle(gb, sc.x(best), sc.y(Math.min(Lb, sc.yd[1])), 5.5, "dot c-accent");
      p.circle(gb, sc.x(best), sc.y(Jb), 5.5, "hollow");
      return "inside the region the surrogate's best θ′ = " + num(best) + " predicts <i>J</i> = " + num(Lb, 3) + "; the true value is " + num(Jb, 3) +
        " (from " + num(ax.S.J, 3) + ") &nbsp;·&nbsp; outside it, <i>L</i> keeps rising while <i>J</i> falls";
    },

    // TRPO's subproblem: maximize gᵀx on the ellipse ½xᵀHx ≤ δ.
    trpo: function (s, p) {
      var sc = this.sc = scale([-3.3, 3.3], [-2.155, 2.155], this.box), X = sc.x, Y = sc.y;
      var H = [[1.4, 0.75], [0.75, 0.9]], det = H[0][0] * H[1][1] - H[0][1] * H[0][1];
      var Hi = [[H[1][1] / det, -H[0][1] / det], [-H[0][1] / det, H[0][0] / det]], gv = s.gTR, d = s.dTR, i;
      var Hig = [Hi[0][0] * gv[0] + Hi[0][1] * gv[1], Hi[1][0] * gv[0] + Hi[1][1] * gv[1]];
      var gHg = gv[0] * Hig[0] + gv[1] * Hig[1], gHgv = gv[0] * (H[0][0] * gv[0] + H[0][1] * gv[1]) + gv[1] * (H[1][0] * gv[0] + H[1][1] * gv[1]);
      var g0 = p.g(null);
      p.line(g0, X(-3.3), Y(0), X(3.3), Y(0), "axisline");
      p.line(g0, X(0), Y(-2.155), X(0), Y(2.155), "axisline");
      var gn = Math.sqrt(gv[0] * gv[0] + gv[1] * gv[1]) || 1, ux = gv[0] / gn, uy = gv[1] / gn, gl = p.g(null, true);
      for (i = -6; i <= 6; i++) {
        var c = i * 0.5;
        p.line(gl, X(c * ux - 5 * uy), Y(c * uy + 5 * ux), X(c * ux + 5 * uy), Y(c * uy - 5 * ux), "contour");
      }
      var ell = [], ge = p.g(null);
      for (i = 0; i <= 120; i++) {
        var a = i / 120 * 2 * Math.PI, u = [Math.cos(a), Math.sin(a)];
        var q = u[0] * (H[0][0] * u[0] + H[0][1] * u[1]) + u[1] * (H[1][0] * u[0] + H[1][1] * u[1]), k = Math.sqrt(2 * d / q);
        ell.push([X(k * u[0]), Y(k * u[1])]);
      }
      p.poly(ge, ell, "fill c-muted", true);
      p.poly(ge, ell, "curve thin c-muted", true);
      var tn = Math.sqrt(2 * d / gHgv), naive = [tn * gv[0], tn * gv[1]], ts = Math.sqrt(2 * d / gHg), best = [ts * Hig[0], ts * Hig[1]];
      var ga = p.g(null);
      p.arrow(ga, X(0), Y(0), X(naive[0]), Y(naive[1]), "c-muted");
      p.arrow(ga, X(0), Y(0), X(best[0]), Y(best[1]), "c-accent");
      p.arrow(ga, X(0), Y(0), X(gv[0]), Y(gv[1]), "c-warm");
      p.circle(ga, X(gv[0]), Y(gv[1]), 14, "hitc");
      p.label("tr-g", "g", X(gv[0]), Y(gv[1]), "ne");
      p.label("tr-x", "\\theta_{k+1} - \\theta_k", X(best[0]), Y(best[1]), best[1] >= 0 ? "nw" : "sw");
      var low = ell.reduce(function (m, q) { return q[1] > m[1] ? q : m; });
      p.label("tr-e", "\\tfrac12 x^\\top H x \\le \\delta", low[0], low[1] + 6, "s");
      var gain = function (v) { return gv[0] * v[0] + gv[1] * v[1]; };
      return "best step √(2δ / gᵀH⁻¹g) · H⁻¹g gains gᵀx = " + num(gain(best), 3) + " &nbsp;·&nbsp; stepping along g itself (gray) to the boundary gains only " + num(gain(naive), 3);
    },

    // Solving Hx = g: steepest descent with exact line search vs conjugate gradient.
    "conjugate-gradient": function (s, p) {
      var sc = this.sc = scale([-3.3, 3.3], [-2.155, 2.155], this.box), X = sc.x, Y = sc.y, i, k;
      var c = Math.cos(0.45), sn = Math.sin(0.45), l1 = 1, l2 = 16;
      var A = [[l1 * c * c + l2 * sn * sn, (l1 - l2) * c * sn], [(l1 - l2) * c * sn, l1 * sn * sn + l2 * c * c]], xs = [1.2, -0.3];
      var b = [A[0][0] * xs[0] + A[0][1] * xs[1], A[1][0] * xs[0] + A[1][1] * xs[1]];
      function mul(v) { return [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]]; }
      function dot(u, v) { return u[0] * v[0] + u[1] * v[1]; }
      var gc = p.g(null, true);
      [0.05, 0.3, 0.8, 1.6, 2.8, 4.5, 6.8, 10, 14].forEach(function (lev) {
        var pts = [];
        for (i = 0; i <= 96; i++) {
          var a = i / 96 * 2 * Math.PI, u = [Math.cos(a), Math.sin(a)], q = dot(u, mul(u)), r = Math.sqrt(2 * lev / q);
          pts.push([X(xs[0] + r * u[0]), Y(xs[1] + r * u[1])]);
        }
        p.poly(gc, pts, "contour", true);
      });
      var x = s.x0.slice(), sd = [x.slice()], r, it = 0;
      for (k = 0; k < 60; k++) {
        r = [b[0] - mul(x)[0], b[1] - mul(x)[1]];
        if (dot(r, r) < 1e-10) break;
        var al = dot(r, r) / dot(r, mul(r));
        x = [x[0] + al * r[0], x[1] + al * r[1]]; sd.push(x.slice()); it++;
      }
      x = s.x0.slice(); r = [b[0] - mul(x)[0], b[1] - mul(x)[1]];
      var pd = r.slice(), cg = [x.slice()];
      for (k = 0; k < 2 && dot(r, r) > 1e-14; k++) {
        var Ap = mul(pd), a2 = dot(r, r) / dot(pd, Ap);
        x = [x[0] + a2 * pd[0], x[1] + a2 * pd[1]]; cg.push(x.slice());
        var rn = [r[0] - a2 * Ap[0], r[1] - a2 * Ap[1]], be = dot(rn, rn) / dot(r, r);
        pd = [rn[0] + be * pd[0], rn[1] + be * pd[1]]; r = rn;
      }
      var at = function (v) { return [X(v[0]), Y(v[1])]; }, gs = p.g(null, true);
      p.poly(gs, cg.map(at), "curve c-accent");
      cg.slice(1).forEach(function (v) { p.circle(gs, X(v[0]), Y(v[1]), 4.5, "dot c-accent"); });
      p.poly(gs, sd.map(at), "curve thin c-warm");
      sd.slice(1).forEach(function (v) { p.circle(gs, X(v[0]), Y(v[1]), 3, "dot c-warm"); });
      var gx = p.g(null);
      p.line(gx, X(xs[0]) - 7, Y(xs[1]), X(xs[0]) + 7, Y(xs[1]), "curve");
      p.line(gx, X(xs[0]), Y(xs[1]) - 7, X(xs[0]), Y(xs[1]) + 7, "curve");
      p.label("cg-s", "x = H^{-1} g", X(xs[0]) + 8, Y(xs[1]) + 6, "se");
      p.circle(gx, X(s.x0[0]), Y(s.x0[1]), 6, "dot");
      p.circle(gx, X(s.x0[0]), Y(s.x0[1]), 16, "hitc");
      p.label("cg-0", "x_0", X(s.x0[0]) - 6, Y(s.x0[1]) - 6, "nw");
      p.label("cg-f", "\\varphi(x) = \\tfrac12 x^\\top H x - g^\\top x", X(-3.1), Y(2.05), "se");
      p.label("cg-a", "\\text{brown: steepest descent}", X(-3.1), Y(1.72), "se");
      p.label("cg-b", "\\text{blue: conjugate gradient}", X(-3.1), Y(1.42), "se");
      return "<span style=\"color:var(--warm)\">steepest descent</span>: " + it + " steps to reach the solution (zigzag) &nbsp;·&nbsp; " +
        "<span style=\"color:var(--focus)\">conjugate gradient</span>: exactly 2 steps, one per dimension";
    },

    "line-search": function (s, p) {
      var ax = policyAxis(s, p, {}), sc = ax.sc, g = s.gamma, tr = RL.trpo(ax.S, g, s.th, s.delta), gl = p.g(null), acc = -1, i;
      for (i = 0; i < 8; i++) {
        var t = s.th + Math.pow(0.5, i) * tr.step, J = RL.solve(t, g).J, ok = J > ax.S.J && RL.KL(s.th, t) <= s.delta;
        var shown = t >= RL.X[0] - 0.3 && t <= RL.X[1] + 0.1;
        if (shown) {
          p.circle(gl, sc.x(t), sc.y(J), 5.5, acc < 0 && ok ? "dot c-accent" : acc < 0 ? "hollow c-warm" : "hollow c-muted");
          if (i < 4) p.label("ls-" + i, "i = " + i, sc.x(t), sc.y(J) - 8, "n");
        }
        if (ok && acc < 0) { acc = i; break; }
      }
      var full = s.th + tr.step;
      return "full step θ + √(2δ/H) = " + num(full) + (full > RL.X[1] ? " (off the chart)" : "") + " &nbsp;·&nbsp; " +
        (acc >= 0 ? "first accepted: <i>i</i> = " + acc + ", θ′ = " + num(s.th + Math.pow(0.5, acc) * tr.step) + ", <i>J</i> " + num(ax.S.J, 3) + " → " + num(RL.solve(s.th + Math.pow(0.5, acc) * tr.step, g).J, 3) :
          "no step of the first 8 improves J; stay at θ");
    },

    ppo: function (s, p) {
      var ax = policyAxis(s, p, { L: true, region: true }), sc = ax.sc, g = s.gamma, rg = RL.region(s.th, s.delta), best = s.th, i;
      for (i = 0; i <= 300; i++) { var t = rg[0] + (rg[1] - rg[0]) * i / 300; if (RL.L(ax.S, g, t) > RL.L(ax.S, g, best)) best = t; }
      var tr = RL.trpo(ax.S, g, s.th, s.delta), tt = s.th + tr.step, gp = p.g(null);
      p.circle(gp, sc.x(best), sc.y(RL.solve(best, g).J), 6, "dot c-accent");
      if (tt <= RL.X[1] && tt >= RL.X[0]) p.circle(gp, sc.x(tt), sc.y(RL.solve(tt, g).J), 6, "hollow c-warm");
      return "exact solution of the trust-region problem θ′ = " + num(best) + " (blue dot) &nbsp;·&nbsp; TRPO's linear-quadratic step lands at " + num(tt) +
        " (brown ring), with true KL " + num(RL.KL(s.th, tt), 3) + " instead of δ = " + num(s.delta);
    },

    "ppo-penalty": function (s, p) {
      var beta = Math.pow(10, s.lb), g = s.gamma, S = RL.solve(s.th, g);
      var pen = function (t) { return RL.L(S, g, t) - beta * RL.KL(s.th, t); };
      var ax = policyAxis(s, p, { L: true, extra: pen }), sc = ax.sc, best = s.th, i;
      for (i = 0; i <= 400; i++) { var t = RL.X[0] + (RL.X[1] - RL.X[0]) * i / 400; if (pen(t) > pen(best)) best = t; }
      var gp = p.g(null), d = RL.KL(s.th, best);
      p.circle(gp, sc.x(best), sc.y(Math.min(pen(best), sc.yd[1])), 6, "dot c-warm");
      p.circle(gp, sc.x(best), sc.y(RL.solve(best, g).J), 5.5, "hollow");
      p.label("pp-p", "L - \\beta\\,\\text{KL}", sc.x(best), sc.y(Math.min(pen(best), sc.yd[1])) - 8, "n");
      var rule = d < s.delta / 1.5 ? "d < δ/1.5, so β is halved next round" : d > 1.5 * s.delta ? "d > 1.5δ, so β is doubled next round" : "d is near δ, so β stays";
      return "penalized maximizer θ′ = " + num(best) + ", true <i>J</i> " + num(S.J, 3) + " → " + num(RL.solve(best, g).J, 3) +
        " &nbsp;·&nbsp; <i>d</i> = KL = " + num(d, 3) + ": " + rule;
    },

    "ppo-clip": function (s, p) {
      var e = s.eps, A = s.sgn, sc = scale([-0.12, 2.12], [-2.25, 2.25]), X = sc.x, Y = sc.y, i, raw = [], clip = [];
      for (i = 0; i <= 200; i++) {
        var r = 2 * i / 200, cr = Math.min(Math.max(r, 1 - e), 1 + e);
        raw.push([X(r), Y(r * A)]); clip.push([X(r), Y(Math.min(r * A, cr * A))]);
      }
      var flatLo = A > 0 ? 1 + e : 0, flatHi = A > 0 ? 2 : 1 - e, gz = p.g(null);
      p.rect(gz, X(flatLo), Y(2.2), X(flatHi) - X(flatLo), Y(-2.2) - Y(2.2), "fill c-muted");
      p.axes(sc, { xticks: [1, 2], xlabel: "r = \\pi_\\theta / \\pi_{\\theta_k}" });
      var gc = p.g(null);
      p.poly(gc, raw, "curve thin c-muted dash");
      p.poly(gc, clip, "curve c-accent");
      [1 - e, 1 + e].forEach(function (v) { p.line(gc, X(v), Y(0) - 5, X(v), Y(0) + 5, "tick strong"); });
      p.label("pc-l", "1 - \\varepsilon", X(1 - e), Y(0) + (A > 0 ? 8 : -8), A > 0 ? "s" : "n");
      p.label("pc-h", "1 + \\varepsilon", X(1 + e), Y(0) + (A > 0 ? 8 : -8), A > 0 ? "s" : "n");
      p.label("pc-f", "\\min\\{r\\hat A,\\ \\text{clip}(r)\\hat A\\}", X(0.08), Y(2.1), "se");
      return (A > 0 ? "good action: raising its probability helps only until r = 1 + ε; beyond that the objective is flat (gray), so the gradient is 0" :
        "bad action: lowering its probability helps only until r = 1 − ε; below that the objective is flat (gray), so the gradient is 0") +
        " &nbsp;·&nbsp; the dashed line is the unclipped r·Â";
    }
  };

  // Rotary position embedding: f(q, m) = q e^{i m θ}, read in the complex plane.
  var RO = {};
  RO.rot = function (v, a) { var c = Math.cos(a), s = Math.sin(a); return [c * v[0] - s * v[1], s * v[0] + c * v[1]]; };
  RO.dot = function (u, v) { return u[0] * v[0] + u[1] * v[1]; };
  RO.len = function (v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1]); };
  RO.ang = function (v) { return Math.atan2(v[1], v[0]); };
  RO.tex = function (v) { return num(v, 2).replace("−", "-"); };
  var THETA = { key: "theta", label: "Angle θ", min: 0.05, max: 1.2, step: 0.01, value: 0.4, show: function (v) { return "θ = " + num(v) + " rad"; } };
  function posn(key, label, value) { return { key: key, label: label, min: 0, max: 15, step: 1, value: value, show: function (v) { return key + " = " + v; } }; }
  RO.controls = {
    "relative-position": [THETA],
    length: [posn("m", "Position", 3), THETA],
    angle: [posn("m", "Position", 3), THETA],
    "embedding-form": [posn("m", "Query position", 5), posn("n", "Key position", 2), THETA],
    frequencies: [
      { key: "pos", label: "Position", min: 0, max: 500, step: 1, value: 10, show: function (v) { return "m = " + v; } },
      { key: "dim", label: "Head size", min: 8, max: 128, step: 8, value: 64, show: function (v) { return "d = " + v; } }
    ]
  };
  RO.plane = { length: 1, angle: 1, "embedding-form": 1 };

  specs.rope = {
    alt: "Figures for rotary position embedding: a heatmap of attention scores that is constant along diagonals, query and key vectors rotating in the complex plane, and a grid of dials turning at different frequencies.",
    story: true,
    controls: function (s) { return RO.controls[s.ch] || []; },
    init: function (s) {
      s.ch = "relative-position";
      for (var c in RO.controls) RO.controls[c].forEach(function (o) { s[o.key] = o.value; });
      s.q = [1.25, 0.3];
      s.k = [0.55, 0.95];
      this.box = BOX;
    },
    select: function (s, slug) {
      if (!slug || slug === s.ch || !RO.controls[slug]) return false;
      s.ch = slug;
      this.box = RO.plane[slug] || slug === "frequencies" ? { l: 12, r: 12, t: 12, b: 12 } : BOX;
      return true;
    },
    render: function (s, p) { return this[s.ch](s, p); },
    drag: function (s, pt, phase) {
      var sc = this.sc;
      if (!sc || !RO.plane[s.ch]) return false;
      if (phase === "start") {
        s.drag = null;
        var best = 30;
        ["q", "k"].forEach(function (key) {
          var v = s[key], d = Math.abs(pt.x - sc.x(v[0])) + Math.abs(pt.y - sc.y(v[1]));
          if (d < best) { best = d; s.drag = key; }
        });
        return !!s.drag;
      }
      var v = [sc.ix(pt.x), sc.iy(pt.y)], r = RO.len(v);
      if (r > 1.6) v = [v[0] * 1.6 / r, v[1] * 1.6 / r];
      if (r < 0.15) v = [v[0] * 0.15 / (r || 1), v[1] * 0.15 / (r || 1)];
      s[s.drag] = v;
    },

    // Scores ⟨f(q, m), f(k, n)⟩ for m, n = 0 … 15: constant along diagonals.
    "relative-position": function (s, p) {
      var N = 16, cell = 21, x0 = 300 - N * cell / 2 + 20, y0 = 26, i, j, top = RO.len(s.q) * RO.len(s.k);
      var g = p.g(null);
      for (i = 0; i < N; i++) for (j = 0; j < N; j++) {
        var v = RO.dot(RO.rot(s.q, i * s.theta), RO.rot(s.k, j * s.theta)) / top;
        var e = p.rect(g, x0 + j * cell, y0 + i * cell, cell - 1, cell - 1, "cell");
        e.style.fill = "color-mix(in srgb, var(" + (v >= 0 ? "--focus" : "--warm") + ") " + Math.round(Math.abs(v) * 85) + "%, var(--surface))";
      }
      for (i = 0; i < N; i += 5) {
        p.text(g, x0 - 8, y0 + i * cell + cell / 2 + 5, String(i), "end");
        p.text(g, x0 + i * cell + cell / 2, y0 + N * cell + 18, String(i));
      }
      p.poly(g, [[x0, y0], [x0 + N * cell, y0 + N * cell]], "curve thin c-muted dash");
      p.label("rp-m", "m", x0 - 30, y0 + N * cell / 2, "w");
      p.label("rp-n", "n", x0 + N * cell / 2, y0 + N * cell + 24, "s");
      return "cell (<i>m</i>, <i>n</i>) is the score ⟨<i>f</i>(<i>q</i>, <i>m</i>), <i>f</i>(<i>k</i>, <i>n</i>)⟩ for query position <i>m</i> and key position <i>n</i>: blue positive, brown negative &nbsp;·&nbsp; every diagonal <i>m</i> − <i>n</i> = const has one color: the score depends only on the relative position";
    },

    // Rotating keeps lengths: f(q, m) stays on the circle of radius ‖q‖.
    length: function (s, p) {
      var sc = this.sc = scale([-2.6, 2.6], [-1.697, 1.697], this.box), X = sc.x, Y = sc.y, m = s.m, a = m * s.theta;
      var fq = RO.rot(s.q, a), fk = RO.rot(s.k, a), g0 = p.g(null);
      p.line(g0, X(-2.6), Y(0), X(2.6), Y(0), "axisline");
      p.line(g0, X(0), Y(-1.7), X(0), Y(1.7), "axisline");
      p.label("ln-re", "\\text{Re}", X(2.55), Y(0) + 4, "sw");
      p.label("ln-im", "\\text{Im}", X(0) + 6, Y(1.65), "se");
      var gc = p.g(null);
      p.circle(gc, X(0), Y(0), RO.len(s.q) * sc.sx, "curve thin c-accent dash");
      p.circle(gc, X(0), Y(0), RO.len(s.k) * sc.sx, "curve thin c-warm dash");
      var gv = p.g(null);
      p.arrow(gv, X(0), Y(0), X(s.q[0]), Y(s.q[1]), "c-muted");
      p.arrow(gv, X(0), Y(0), X(s.k[0]), Y(s.k[1]), "c-muted");
      p.arrow(gv, X(0), Y(0), X(fq[0]), Y(fq[1]), "c-accent");
      p.arrow(gv, X(0), Y(0), X(fk[0]), Y(fk[1]), "c-warm");
      p.circle(gv, X(s.q[0]), Y(s.q[1]), 14, "hitc");
      p.circle(gv, X(s.k[0]), Y(s.k[1]), 14, "hitc");
      p.label("ln-q", "q", X(s.q[0]), Y(s.q[1]), "e");
      p.label("ln-k", "k", X(s.k[0]), Y(s.k[1]), "e");
      p.label("ln-fq", "f(q, m)", X(fq[0]), Y(fq[1]), fq[0] >= 0 ? "ne" : "nw");
      p.label("ln-fk", "f(k, m)", X(fk[0]), Y(fk[1]), fk[0] >= 0 ? "ne" : "nw");
      return "‖<i>q</i>‖ = " + num(RO.len(s.q)) + ", ‖<i>f</i>(<i>q</i>, " + m + ")‖ = " + num(RO.len(fq)) + " &nbsp;·&nbsp; ‖<i>k</i>‖ = " + num(RO.len(s.k)) +
        ", ‖<i>f</i>(<i>k</i>, " + m + ")‖ = " + num(RO.len(fk)) + " &nbsp;·&nbsp; <i>R<sub>f</sub></i>(·, <i>m</i>) = ‖·‖ for every <i>m</i>. Drag <i>q</i> and <i>k</i>.";
    },

    // Each position adds the same angle θ: φ(m) = mθ, the same for q and k.
    angle: function (s, p) {
      var sc = this.sc = scale([-2.6, 2.6], [-1.697, 1.697], this.box), X = sc.x, Y = sc.y, m = s.m, th = s.theta, j;
      var g0 = p.g(null);
      p.line(g0, X(-2.6), Y(0), X(2.6), Y(0), "axisline");
      p.line(g0, X(0), Y(-1.7), X(0), Y(1.7), "axisline");
      [["q", "c-accent"], ["k", "c-warm"]].forEach(function (t) {
        var v = s[t[0]], r = RO.len(v), a0 = RO.ang(v), gp = p.g(null), arc = [];
        for (j = 0; j <= 60; j++) { var a = a0 + m * th * j / 60; arc.push([X(r * Math.cos(a)), Y(r * Math.sin(a))]); }
        if (m > 0) p.poly(gp, arc, "curve thin " + t[1]);
        for (j = 0; j <= m; j++) { var w = RO.rot(v, j * th); p.circle(gp, X(w[0]), Y(w[1]), j === m ? 5 : 3, "dot " + t[1]); }
        var fv = RO.rot(v, m * th);
        p.arrow(gp, X(0), Y(0), X(v[0]), Y(v[1]), "c-muted");
        p.arrow(gp, X(0), Y(0), X(fv[0]), Y(fv[1]), t[1]);
        p.circle(gp, X(v[0]), Y(v[1]), 14, "hitc");
        p.label("an-" + t[0], t[0], X(v[0]), Y(v[1]), "e");
        if (m > 0 && t[0] === "q") { var mid = a0 + m * th / 2; p.label("an-mt", "m\\theta", X(1.08 * r * Math.cos(mid)), Y(1.08 * r * Math.sin(mid)), Math.cos(mid) >= 0 ? "ne" : "nw"); }
      });
      var fq = RO.rot(s.q, m * th), fk = RO.rot(s.k, m * th);
      var d0 = RO.ang(s.k) - RO.ang(s.q), d1 = RO.ang(fk) - RO.ang(fq), wrap = function (a) { return Math.atan2(Math.sin(a), Math.cos(a)); };
      return "φ(" + m + ") = " + m + "θ = " + num(m * th) + " rad for both vectors &nbsp;·&nbsp; angle from <i>q</i> to <i>k</i>: " + num(wrap(d0)) + " before, " + num(wrap(d1)) +
        " after rotating both to position " + m + ". Drag <i>q</i> and <i>k</i>.";
    },

    // The full picture: q at position m, k at position n.
    "embedding-form": function (s, p) {
      var sc = this.sc = scale([-2.6, 2.6], [-1.697, 1.697], this.box), X = sc.x, Y = sc.y, th = s.theta;
      var fq = RO.rot(s.q, s.m * th), fk = RO.rot(s.k, s.n * th), g0 = p.g(null);
      p.line(g0, X(-2.6), Y(0), X(2.6), Y(0), "axisline");
      p.line(g0, X(0), Y(-1.7), X(0), Y(1.7), "axisline");
      var gw = p.g(null), a1 = RO.ang(fq), a2 = RO.ang(fk), da = Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)), arc = [], j;
      for (j = 0; j <= 40; j++) { var a = a1 + da * j / 40; arc.push([X(0.45 * Math.cos(a)), Y(0.45 * Math.sin(a))]); }
      p.poly(gw, arc, "curve thin");
      var gv = p.g(null);
      p.arrow(gv, X(0), Y(0), X(s.q[0]), Y(s.q[1]), "c-muted");
      p.arrow(gv, X(0), Y(0), X(s.k[0]), Y(s.k[1]), "c-muted");
      p.arrow(gv, X(0), Y(0), X(fq[0]), Y(fq[1]), "c-accent");
      p.arrow(gv, X(0), Y(0), X(fk[0]), Y(fk[1]), "c-warm");
      p.circle(gv, X(s.q[0]), Y(s.q[1]), 14, "hitc");
      p.circle(gv, X(s.k[0]), Y(s.k[1]), 14, "hitc");
      p.label("ef-q", "q", X(s.q[0]), Y(s.q[1]), "e");
      p.label("ef-k", "k", X(s.k[0]), Y(s.k[1]), "e");
      p.label("ef-fq", "q\\,e^{\\hat i m\\theta}", X(fq[0]), Y(fq[1]), fq[0] >= 0 ? "ne" : "nw");
      p.label("ef-fk", "k\\,e^{\\hat i n\\theta}", X(fk[0]), Y(fk[1]), fk[0] >= 0 ? "ne" : "nw");
      var score = RO.dot(fq, fk), plain = s.q[0] * s.k[0] + s.q[1] * s.k[1], qk = [s.q[0] * s.k[0] + s.q[1] * s.k[1], s.q[1] * s.k[0] - s.q[0] * s.k[1]];
      var viaG = RO.rot(qk, (s.m - s.n) * th)[0], c = Math.cos(s.m * th), sn = Math.sin(s.m * th);
      return "rotation for <i>m</i> = " + s.m + ": [[" + num(c) + ", " + num(-sn) + "], [" + num(sn) + ", " + num(c) + "]] &nbsp;·&nbsp; ⟨<i>f</i>(<i>q</i>, " + s.m + "), <i>f</i>(<i>k</i>, " + s.n + ")⟩ = " + num(score, 3) +
        " = Re(<i>qk</i>* e<sup><i>i</i>(" + (s.m - s.n) + ")θ</sup>) = " + num(viaG, 3) + " &nbsp;·&nbsp; without positions ⟨<i>q</i>, <i>k</i>⟩ = " + num(plain, 3) + ". Move <i>m</i> and <i>n</i> together: the score stays.";
    },

    // One dial per pair i: the hand turns by θ_i = 10000^{-2(i-1)/d} per position.
    frequencies: function (s, p) {
      var pairs = s.dim / 2, cols = pairs <= 8 ? pairs : pairs <= 32 ? 8 : 16, rows = Math.ceil(pairs / cols);
      var cw = 576 / cols, ch = Math.min(cw, 352 / rows), r = Math.min(cw, ch) * 0.38, g = p.g(null), i;
      for (i = 0; i < pairs; i++) {
        var th = Math.pow(10000, -2 * i / s.dim), a = s.pos * th, cx = 12 + cw * (i % cols + 0.5), cy = 16 + ch * (Math.floor(i / cols) + 0.5);
        p.circle(g, cx, cy, r, "curve thin c-muted");
        p.line(g, cx, cy, cx + r * Math.cos(-a), cy + r * Math.sin(-a), "curve " + (i < pairs / 4 ? "c-accent" : i < pairs / 2 ? "" : "c-warm"));
        p.line(g, cx + r, cy, cx + r + 4, cy, "tick");
        if (r > 14 && (i % (cols / 4 || 1) === 0 || cols <= 8)) p.text(g, cx, cy + r + 15, "i = " + (i + 1));
      }
      var wl = function (k) { return 2 * Math.PI * Math.pow(10000, 2 * k / s.dim); };
      return "dial <i>i</i> turns θ<sub><i>i</i></sub> = 10000<sup>−2(<i>i</i>−1)/<i>d</i></sup> per position &nbsp;·&nbsp; full turn every " + num(wl(0), 1) + " positions for <i>i</i> = 1, every " +
        Math.round(wl(pairs - 1)).toLocaleString("en-US") + " for <i>i</i> = " + pairs + " &nbsp;·&nbsp; the fast dials tell nearby positions apart, the slow ones distant ones";
    }
  };

  // Finite elements for −u″ = f on (0, 1), u(0) = u(1) = 0, then a 2-D plate.
  var FE = { PI: Math.PI };
  FE.u = function (x) { return Math.sin(Math.PI * x) + 0.4 * Math.sin(2 * Math.PI * x); };
  FE.du = function (x) { return Math.PI * Math.cos(Math.PI * x) + 0.8 * Math.PI * Math.cos(2 * Math.PI * x); };
  FE.f = function (x) { var p2 = Math.PI * Math.PI; return p2 * Math.sin(Math.PI * x) + 1.6 * p2 * Math.sin(2 * Math.PI * x); };
  FE.gx = [-Math.sqrt(0.6), 0, Math.sqrt(0.6)];
  FE.gw = [5 / 9, 8 / 9, 5 / 9];
  // Integrate fn over [a, b] with 3-point Gauss.
  FE.quad = function (fn, a, b) {
    var s = 0, m = (a + b) / 2, r = (b - a) / 2;
    for (var q = 0; q < 3; q++) s += FE.gw[q] * fn(m + r * FE.gx[q]);
    return s * r;
  };
  // Linear elements on N equal cells: K = (1/h) tridiag(−1, 2, −1), F_i = ∫ f φ_i.
  FE.solve = function (N) {
    var h = 1 / N, n = N - 1, F = [], i, U = [0];
    for (i = 1; i <= n; i++) {
      var xi = i * h;
      F.push(FE.quad(function (x) { return FE.f(x) * (x - xi + h) / h; }, xi - h, xi) +
        FE.quad(function (x) { return FE.f(x) * (xi + h - x) / h; }, xi, xi + h));
    }
    var c = [], d = [];
    for (i = 0; i < n; i++) {
      var b = 2 / h, a = -1 / h, den = b - (i ? a * c[i - 1] : 0);
      c.push(-1 / h / den);
      d.push((F[i] - (i ? a * d[i - 1] : 0)) / den);
    }
    var X = new Array(n);
    for (i = n - 1; i >= 0; i--) X[i] = d[i] - (i < n - 1 ? c[i] * X[i + 1] : 0);
    return U.concat(X, [0]);
  };
  FE.errors = function (N, U) {
    var h = 1 / N, e0 = 0, e1 = 0, emax = 0;
    for (var e = 0; e < N; e++) {
      var a = e * h, slope = (U[e + 1] - U[e]) / h;
      e0 += FE.quad(function (x) { var d = FE.u(x) - (U[e] + slope * (x - a)); return d * d; }, a, a + h);
      e1 += FE.quad(function (x) { var d = FE.du(x) - slope; return d * d; }, a, a + h);
      emax = Math.max(emax, Math.abs(U[e + 1] - FE.u(a + h)));
    }
    return { L2: Math.sqrt(e0), H1: Math.sqrt(e1), node: emax };
  };
  // Plot helper: a function on [0, 1].
  FE.curve = function (p, g, sc, fn, cls) {
    var pts = [];
    for (var i = 0; i <= 200; i++) { var x = i / 200; pts.push([sc.x(x), sc.y(fn(x))]); }
    p.poly(g, pts, cls);
  };

  // 2-D: steady heat −Δu = f on an L-shaped plate held at 0 on its edges,
  // linear triangles on a uniform grid, solved by conjugate gradient.
  FE.plate = function (n, src, uniform) {
    var h = 2 / n, id = [], nodes = [], i, j;
    function inside(x, y) { return !(x > 1e-9 && y < -1e-9); }
    function boundary(x, y) { return Math.abs(Math.abs(x) - 1) < 1e-9 || Math.abs(Math.abs(y) - 1) < 1e-9 || (Math.abs(x) < 1e-9 && y <= 1e-9) || (Math.abs(y) < 1e-9 && x >= -1e-9); }
    for (j = 0; j <= n; j++) for (i = 0; i <= n; i++) {
      var x = -1 + i * h, y = -1 + j * h;
      id.push(inside(x, y) && !boundary(x, y) ? nodes.push([x, y]) - 1 : -1);
    }
    var tris = [], rows = nodes.map(function () { return {}; }), F = nodes.map(function () { return 0; });
    function f(x, y) {
      if (uniform) return 1;
      var dx = x - src[0], dy = y - src[1];
      return 25 * Math.exp(-(dx * dx + dy * dy) / 0.02);
    }
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
      var cx = -1 + (i + 0.5) * h, cy = -1 + (j + 0.5) * h;
      if (!inside(cx, cy)) continue;
      var v = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      [[v[0], v[1], v[2]], [v[0], v[2], v[3]]].forEach(function (t) {
        var P = t.map(function (q) { return [-1 + q[0] * h, -1 + q[1] * h]; }), I = t.map(function (q) { return id[q[1] * (n + 1) + q[0]]; });
        var area = Math.abs((P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1])) / 2;
        var G = [0, 1, 2].map(function (a) {
          var b = (a + 1) % 3, c = (a + 2) % 3;
          return [(P[b][1] - P[c][1]) / (2 * area), (P[c][0] - P[b][0]) / (2 * area)];
        });
        var fc = f((P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3);
        for (var a = 0; a < 3; a++) {
          if (I[a] < 0) continue;
          F[I[a]] += fc * area / 3;
          for (var b = 0; b < 3; b++) if (I[b] >= 0) rows[I[a]][I[b]] = (rows[I[a]][I[b]] || 0) + area * (G[a][0] * G[b][0] + G[a][1] * G[b][1]);
        }
        tris.push({ P: P, I: I });
      });
    }
    var K = rows.map(function (r) { var ks = Object.keys(r); return { c: ks.map(Number), v: ks.map(function (k) { return r[k]; }) }; });
    function mul(x) { return K.map(function (r) { var s = 0; for (var q = 0; q < r.c.length; q++) s += r.v[q] * x[r.c[q]]; return s; }); }
    var m = nodes.length, U = new Array(m).fill(0), R = F.slice(), Pd = R.slice(), rr = 0, it = 0, k;
    for (k = 0; k < m; k++) rr += R[k] * R[k];
    var r0 = Math.sqrt(rr);
    while (it < 2000 && Math.sqrt(rr) > 1e-9 * r0) {
      var AP = mul(Pd), pAp = 0;
      for (k = 0; k < m; k++) pAp += Pd[k] * AP[k];
      var al = rr / pAp, rn = 0;
      for (k = 0; k < m; k++) { U[k] += al * Pd[k]; R[k] -= al * AP[k]; rn += R[k] * R[k]; }
      for (k = 0; k < m; k++) Pd[k] = R[k] + rn / rr * Pd[k];
      rr = rn; it++;
    }
    return { nodes: nodes, tris: tris, U: U, it: it };
  };

  function NN(key, label, min, max, value) { return { key: key, label: label, min: min, max: max, step: 1, value: value, show: function (v) { return label === "Element" ? "e = " + v : label === "Hat" ? "i = " + v : "N = " + v; } }; }
  FE.controls = {
    "strong-form": [],
    "weak-form": [
      { key: "vc", label: "Test center", min: 0.1, max: 0.9, step: 0.01, value: 0.35, show: function (v) { return "c = " + num(v); } },
      { key: "vw", label: "Test width", min: 0.05, max: 0.45, step: 0.01, value: 0.2, show: function (v) { return "w = " + num(v); } }
    ],
    "lax-milgram": [{ key: "cr", label: "Reaction", min: -30, max: 20, step: 0.5, value: 0, show: function (v) { return "c = " + num(v, 1); } }],
    galerkin: [{ key: "vh", label: "Subspace", min: 0, max: 3.14, step: 0.01, value: 0.25, show: function (v) { return "angle " + num(v); } }],
    "finite-elements": [NN("NF", "Elements", 2, 16, 6), NN("hat", "Hat", 1, 15, 2)],
    assembly: [NN("NA", "Elements", 2, 12, 6), NN("el", "Element", 1, 12, 3)],
    solve: [NN("NS", "Elements", 2, 64, 4)],
    convergence: [{ key: "kp", label: "Elements", min: 1, max: 8, step: 1, value: 3, show: function (v) { return "N = " + Math.pow(2, v); } }],
    application: [
      { key: "load", label: "Heat source", type: "choice", value: "spot", options: [["spot", "Hot spot"], ["uniform", "Uniform"]] },
      { key: "mesh", label: "Mesh", min: 8, max: 40, step: 4, value: 24, show: function (v) { return v + " × " + v + " cells"; } }
    ]
  };
  FE.wide = { galerkin: 1, application: 1, assembly: 1 };
  FE.hints = { galerkin: "Drag u.", application: "Drag the hot spot." };

  specs.fem = {
    alt: "Figures for the finite element method: the model problem, a test function in the weak form, coercivity by mode, Galerkin projection, hat functions, the stiffness matrix, the computed solution, error convergence, and the temperature in an L-shaped plate.",
    story: true,
    controls: function (s) { return FE.controls[s.ch] || []; },
    init: function (s, thumb) {
      s.ch = thumb ? "application" : "strong-form";
      for (var c in FE.controls) FE.controls[c].forEach(function (o) { s[o.key] = o.value; });
      s.ug = [1.5, 0.75];
      s.src = [-0.45, 0.4];
      this.box = thumb ? { l: 12, r: 12, t: 12, b: 12 } : BOX;
      if (thumb) s.mesh = 16;
    },
    select: function (s, slug) {
      if (!slug || slug === s.ch || !FE.controls[slug]) return false;
      s.ch = slug;
      this.box = FE.wide[slug] ? { l: 12, r: 12, t: 12, b: 12 } : BOX;
      return true;
    },
    render: function (s, p) {
      var out = this[s.ch](s, p) || "";
      var hint = s.ch === "application" && s.load === "uniform" ? "" : FE.hints[s.ch];
      return out + (hint ? " <span class=\"muted\">" + hint + "</span>" : "");
    },
    drag: function (s, pt, phase) {
      var sc = this.sc;
      if (!sc || (s.ch !== "galerkin" && s.ch !== "application")) return false;
      var v = s.ch === "galerkin" ? s.ug : s.src;
      if (phase === "start") return Math.abs(pt.x - sc.x(v[0])) + Math.abs(pt.y - sc.y(v[1])) < 30;
      var x = sc.ix(pt.x), y = sc.iy(pt.y);
      if (s.ch === "galerkin") s.ug = [clamp(x, -3.1, 3.1), clamp(y, -2, 2)];
      else {
        x = clamp(x, -0.95, 0.95); y = clamp(y, -0.95, 0.95);
        if (x > 0 && y < 0) { if (x < -y) x = -0.02; else y = 0.02; }
        s.src = [x, y];
      }
    },

    "strong-form": function (s, p) {
      var sc = scale([-0.08, 1.12], [-1.1, 1.6]), g = p.g(null, true);
      p.axes(sc, { xticks: [0.5, 1], yticks: [1], xlabel: "x" });
      FE.curve(p, g, sc, function (x) { return FE.f(x) / 25; }, "curve thin c-warm");
      FE.curve(p, g, sc, FE.u, "curve c-accent");
      p.label("sf-u", "u(x)", sc.x(0.3), sc.y(FE.u(0.3)), "nw");
      p.label("sf-f", "f(x) / 25", sc.x(0.8), sc.y(FE.f(0.8) / 25), "se");
      p.label("sf-0", "u(0) = 0", sc.x(0), sc.y(0) + 6, "se");
      p.label("sf-1", "u(1) = 0", sc.x(1), sc.y(0) - 6, "ne");
      return "−<i>u</i>″ = <i>f</i> on (0, 1), <i>u</i>(0) = <i>u</i>(1) = 0 &nbsp;·&nbsp; here <i>f</i> = π² sin π<i>x</i> + 1.6π² sin 2π<i>x</i>, so the exact solution <i>u</i> = sin π<i>x</i> + 0.4 sin 2π<i>x</i> is known and we can measure errors later";
    },

    "weak-form": function (s, p) {
      var c = s.vc, w = s.vw;
      var v = function (x) { var t = (x - c) / w; return Math.abs(t) < 1 ? (1 - t * t) * (1 - t * t) : 0; };
      var dv = function (x) { var t = (x - c) / w; return Math.abs(t) < 1 ? -4 * t * (1 - t * t) / w : 0; };
      var sc = scale([-0.08, 1.12], [-14, 24]), X = sc.x, Y = sc.y, a = Math.max(0, c - w), b = Math.min(1, c + w);
      var g = p.g(null, true), i, A = [], B = [];
      for (i = 0; i <= 200; i++) { var x = a + (b - a) * i / 200; A.push([X(x), Y(FE.du(x) * dv(x))]); B.push([X(x), Y(FE.f(x) * v(x))]); }
      p.poly(g, [[X(a), Y(0)]].concat(A, [[X(b), Y(0)]]), "fill c-accent", true);
      p.poly(g, [[X(a), Y(0)]].concat(B, [[X(b), Y(0)]]), "fill c-warm", true);
      p.poly(g, A, "curve c-accent");
      p.poly(g, B, "curve c-warm");
      FE.curve(p, g, sc, function (x) { return 8 * v(x); }, "curve thin c-muted dash");
      p.axes(sc, { xticks: [0.5, 1], xlabel: "x" });
      p.label("wf-v", "v(x)", X(c), Y(8) - 4, "n");
      p.label("wf-a", "\\text{blue: } u'(x)\\,v'(x)", X(0.62), Y(21), "se");
      p.label("wf-b", "\\text{brown: } f(x)\\,v(x)", X(0.62), Y(17), "se");
      var I1 = 0, I2 = 0;
      for (i = 0; i < 40; i++) {
        var x0 = a + (b - a) * i / 40, x1 = a + (b - a) * (i + 1) / 40;
        I1 += FE.quad(function (x) { return FE.du(x) * dv(x); }, x0, x1);
        I2 += FE.quad(function (x) { return FE.f(x) * v(x); }, x0, x1);
      }
      return "<span style=\"color:var(--focus)\">∫ <i>u</i>′<i>v</i>′ d<i>x</i> = " + num(I1, 4) + "</span> &nbsp;·&nbsp; <span style=\"color:var(--warm)\">∫ <i>f v</i> d<i>x</i> = " + num(I2, 4) +
        "</span> &nbsp;·&nbsp; different curves, equal areas, for every test function <i>v</i>";
    },

    "lax-milgram": function (s, p) {
      var c = s.cr, sc = scale([0, 11], [-2.4, 2.6]), X = sc.x, Y = sc.y, g = p.g(null), k;
      for (k = 1; k <= 10; k++) {
        var q = 1 + c / (k * k * Math.PI * Math.PI);
        p.rect(g, X(k - 0.35), Y(Math.max(q, 0)), 0.7 * sc.sx, Math.abs(q) * sc.sy, "fill " + (q > 0 ? "c-accent" : "c-warm"));
        p.rect(g, X(k - 0.35), Y(Math.max(q, 0)), 0.7 * sc.sx, Math.abs(q) * sc.sy, "curve thin " + (q > 0 ? "c-accent" : "c-warm"));
      }
      p.axes(sc, { xticks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], yticks: [-2, -1, 1, 2], xlabel: "k" });
      var alpha = Math.min(1, 1 + c / (Math.PI * Math.PI));
      p.line(g, X(0.4), Y(alpha), X(10.7), Y(alpha), "curve thin c-muted dash");
      p.label("lm-a", "\\alpha", X(10.7), Y(alpha), "e");
      p.label("lm-q", "a(\\phi_k, \\phi_k) / \\lVert \\phi_k' \\rVert^2", X(0.6), Y(2.5), "se");
      var pi2 = Math.PI * Math.PI;
      return "<i>a</i>(<i>u</i>, <i>v</i>) = ∫ <i>u</i>′<i>v</i>′ + <i>c uv</i>, modes φ<sub><i>k</i></sub> = sin <i>k</i>π<i>x</i> &nbsp;·&nbsp; " +
        (alpha > 1e-9 ? "coercive with α = " + num(alpha, 3) + ": Lax–Milgram gives one solution, with ‖<i>u</i>′‖ ≤ ‖ℓ‖ / α" :
          Math.abs(c + pi2) < 0.3 ? "c ≈ −π²: sin π<i>x</i> solves the problem with <i>f</i> = 0, so solutions are not unique" :
          "not coercive (mode 1 has negative energy): Lax–Milgram no longer applies") +
        " &nbsp;·&nbsp; for <i>f</i> = sin π<i>x</i> the solution is sin π<i>x</i> / (π² + <i>c</i>)" + (Math.abs(c + pi2) > 0.3 ? " = " + num(1 / (pi2 + c), 3) + " sin π<i>x</i>" : "");
    },

    galerkin: function (s, p) {
      var sc = this.sc = scale([-3.3, 3.3], [-2.155, 2.155], this.box), X = sc.x, Y = sc.y, A = [[2, 0.9], [0.9, 1]], u = s.ug, i;
      var d = [Math.cos(s.vh), Math.sin(s.vh)], Ad = [A[0][0] * d[0] + A[0][1] * d[1], A[1][0] * d[0] + A[1][1] * d[1]];
      var t = (Ad[0] * u[0] + Ad[1] * u[1]) / (d[0] * Ad[0] + d[1] * Ad[1]), uh = [t * d[0], t * d[1]];
      var te = d[0] * u[0] + d[1] * u[1], ue = [te * d[0], te * d[1]];
      var en = function (w) { return Math.sqrt(w[0] * (A[0][0] * w[0] + A[0][1] * w[1]) + w[1] * (A[1][0] * w[0] + A[1][1] * w[1])); };
      var r = en([u[0] - uh[0], u[1] - uh[1]]), ell = [];
      for (i = 0; i <= 120; i++) {
        var a = i / 120 * 2 * Math.PI, e = [Math.cos(a), Math.sin(a)], k = r / en(e);
        ell.push([X(u[0] + k * e[0]), Y(u[1] + k * e[1])]);
      }
      var g = p.g(null);
      p.line(g, X(-3.3), Y(0), X(3.3), Y(0), "axisline");
      p.line(g, X(0), Y(-2.155), X(0), Y(2.155), "axisline");
      var gl = p.g(null, true);
      p.line(gl, X(-6 * d[0]), Y(-6 * d[1]), X(6 * d[0]), Y(6 * d[1]), "curve c-muted");
      p.poly(gl, ell, "curve thin c-accent dash", true);
      p.line(gl, X(u[0]), Y(u[1]), X(uh[0]), Y(uh[1]), "curve thin c-accent");
      p.line(gl, X(u[0]), Y(u[1]), X(ue[0]), Y(ue[1]), "curve thin c-muted dash");
      p.circle(g, X(ue[0]), Y(ue[1]), 4, "hollow c-muted");
      p.circle(g, X(uh[0]), Y(uh[1]), 5.5, "dot c-accent");
      p.circle(g, X(u[0]), Y(u[1]), 6, "dot");
      p.circle(g, X(u[0]), Y(u[1]), 16, "hitc");
      p.label("ga-u", "u", X(u[0]) + 6, Y(u[1]) - 6, "ne");
      p.label("ga-uh", "u_h", X(uh[0]), Y(uh[1]) + 6, "s");
      var lx = 2.6 * d[0], ly = 2.6 * d[1];
      p.label("ga-V", "V_h", X(lx), Y(ly), "n");
      return "energy error ‖<i>u</i> − <i>u<sub>h</sub></i>‖<sub><i>a</i></sub> = " + num(r, 3) + " (blue: Galerkin) &nbsp;·&nbsp; the ordinary orthogonal projection (gray ring) has energy error " +
        num(en([u[0] - ue[0], u[1] - ue[1]]), 3) + " &nbsp;·&nbsp; the dashed ellipse, a sphere in the energy norm, touches <i>V<sub>h</sub></i> exactly at <i>u<sub>h</sub></i>";
    },

    "finite-elements": function (s, p) {
      var N = s.NF, h = 1 / N, hi = Math.min(s.hat, N - 1), sc = scale([-0.08, 1.12], [-0.7, 1.6]), X = sc.x, Y = sc.y, g = p.g(null), i;
      p.axes(sc, { xticks: [0.5, 1], yticks: [1], xlabel: "x" });
      for (i = 1; i < N; i++) {
        var pts = [[X((i - 1) * h), Y(0)], [X(i * h), Y(1)], [X((i + 1) * h), Y(0)]];
        p.poly(g, pts, i === hi ? "curve c-warm" : "curve thin c-muted");
      }
      FE.curve(p, g, sc, FE.u, "curve thin");
      var I = [];
      for (i = 0; i <= N; i++) I.push([X(i * h), Y(FE.u(i * h))]);
      p.poly(g, I, "curve c-accent");
      for (i = 0; i <= N; i++) { p.line(g, X(i * h), Y(0) - 5, X(i * h), Y(0) + 5, "tick strong"); if (i > 0 && i < N) p.circle(g, X(i * h), Y(FE.u(i * h)), 3.5, "dot c-accent"); }
      p.label("fe-phi", "\\phi_{" + hi + "}", X(hi * h), Y(1) - 4, "n");
      p.label("fe-u", "u", X(0.12), Y(FE.u(0.12)), "nw");
      p.label("fe-I", "\\textstyle\\sum_i u(x_i)\\,\\phi_i", X(0.62), Y(FE.u(0.62)) + 8, "ne");
      return "<i>V<sub>h</sub></i> = continuous, piecewise-linear functions on " + N + " elements, zero at both ends: dimension " + (N - 1) +
        " &nbsp;·&nbsp; hat φ<sub><i>i</i></sub> is 1 at node <i>i</i>, 0 at all others, and nonzero on only two elements";
    },

    assembly: function (s, p) {
      var N = s.NA, n = N - 1, e = Math.min(s.el, N), g = p.g(null), i, j;
      var x0 = 90, x1 = 510, ym = 40;
      p.line(g, x0, ym, x1, ym, "curve thin");
      p.line(g, x0 + (e - 1) * (x1 - x0) / N, ym, x0 + e * (x1 - x0) / N, ym, "curve c-warm");
      for (i = 0; i <= N; i++) {
        var xx = x0 + i * (x1 - x0) / N;
        p.circle(g, xx, ym, 4, i === 0 || i === N ? "hollow c-muted" : "dot");
        p.text(g, xx, ym - 10, String(i));
      }
      var cs = Math.min(300 / n, 34), mx = 300 - n * cs / 2, my = 75;
      var inBlock = function (a) { return a === e - 2 || a === e - 1; };
      for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
        var v = i === j ? 2 : Math.abs(i - j) === 1 ? -1 : 0;
        var rc = p.rect(g, mx + j * cs, my + i * cs, cs - 1, cs - 1, "cell");
        rc.style.fill = v ? "color-mix(in srgb, var(" + (v > 0 ? "--focus" : "--warm") + ") " + (v > 0 ? 60 : 35) + "%, var(--surface))" : "color-mix(in srgb, var(--ink) 5%, var(--surface))";
        if (v && cs >= 24) p.text(g, mx + j * cs + cs / 2, my + i * cs + cs / 2 + 5, v > 0 ? "2" : "−1");
      }
      for (i = 0; i < n; i++) for (j = 0; j < n; j++) if (inBlock(i) && inBlock(j))
        p.rect(g, mx + j * cs, my + i * cs, cs - 1, cs - 1, "curve thin c-warm");
      p.label("as-K", "K = \\tfrac1h", mx - 8, my + n * cs / 2, "w");
      var ke = e === 1 || e === N ? "touches a boundary node, so only one entry (1/h on the diagonal) enters K" : "adds the 2 × 2 block (1/h)[[1, −1], [−1, 1]] to rows and columns " + (e - 1) + " and " + e;
      return "element " + e + " " + ke + " &nbsp;·&nbsp; each interior row collects two such blocks: 2, −1, −1 &nbsp;·&nbsp; " + (3 * n - 2) + " nonzeros out of " + n * n + ": K is sparse, symmetric and positive definite";
    },

    solve: function (s, p) {
      var N = s.NS, U = FE.solve(N), E = FE.errors(N, U), sc = scale([-0.08, 1.12], [-0.7, 1.6]), X = sc.x, Y = sc.y, g = p.g(null, true), i;
      p.axes(sc, { xticks: [0.5, 1], yticks: [1], xlabel: "x" });
      FE.curve(p, g, sc, FE.u, "curve thin");
      p.poly(g, U.map(function (v, k) { return [X(k / N), Y(v)]; }), "curve c-accent");
      if (N <= 32) for (i = 1; i < N; i++) p.circle(g, X(i / N), Y(U[i]), 3.5, "dot c-accent");
      p.label("so-uh", "u_h = \\textstyle\\sum_j U_j \\phi_j", X(0.18), Y(U[Math.round(0.18 * N)] || FE.u(0.18)) - 6, "nw");
      p.label("so-u", "u = \\sin \\pi x + 0.4 \\sin 2\\pi x", X(0.62), Y(FE.u(0.62)) - 6, "ne");
      return "solve <i>KU</i> = <i>F</i> with " + (N - 1) + " unknowns &nbsp;·&nbsp; errors: L² " + sci(E.L2) + ", energy ‖(<i>u</i> − <i>u<sub>h</sub></i>)′‖ " + sci(E.H1) +
        " &nbsp;·&nbsp; at the nodes only " + sci(Math.max(E.node, 1e-16)) + ": in 1-D, linear elements are exact at the nodes up to quadrature";
    },

    convergence: function (s, p) {
      var sc = scale([-2.65, -0.05], [-5.6, 0.6]), X = sc.x, Y = sc.y, g = p.g(null), k, L2 = [], H1 = [];
      for (k = 1; k <= 8; k++) { var N = Math.pow(2, k), E = FE.errors(N, FE.solve(N)); L2.push([X(-Math.log10(N)), Y(Math.log10(E.L2))]); H1.push([X(-Math.log10(N)), Y(Math.log10(E.H1))]); }
      for (k = -5; k <= 0; k++) { p.line(g, X(-2.65), Y(k), X(-0.05), Y(k), "grid"); p.text(g, X(-2.65) - 6, Y(k) + 5, "1e" + k, "end"); }
      [2, 8, 32, 128].forEach(function (N) { var x = X(-Math.log10(N)); p.line(g, x, Y(-5.6), x, Y(0.6), "grid"); p.text(g, x, Y(-5.6) + 18, "h = 1/" + N); });
      p.poly(g, H1, "curve c-warm"); p.poly(g, L2, "curve c-accent");
      H1.forEach(function (q, i) { p.circle(g, q[0], q[1], i === s.kp - 1 ? 6.5 : 3.5, "dot c-warm"); });
      L2.forEach(function (q, i) { p.circle(g, q[0], q[1], i === s.kp - 1 ? 6.5 : 3.5, "dot c-accent"); });
      p.label("cv-h", "\\lVert (u - u_h)' \\rVert \\sim h", H1[4][0], H1[4][1] - 10, "nw");
      p.label("cv-l", "\\lVert u - u_h \\rVert \\sim h^2", L2[4][0], L2[4][1] + 10, "se");
      var N0 = Math.pow(2, s.kp), E0 = FE.errors(N0, FE.solve(N0)), E1 = FE.errors(2 * N0, FE.solve(2 * N0));
      return "<i>N</i> = " + N0 + ": energy error " + sci(E0.H1) + ", L² error " + sci(E0.L2) + " &nbsp;·&nbsp; halving <i>h</i> divides them by " + num(E0.H1 / E1.H1, 2) + " and " + num(E0.L2 / E1.L2, 2) +
        " &nbsp;·&nbsp; slopes 1 and 2 on this log–log plot";
    },

    application: function (s, p) {
      var sc = this.sc = scale([-1.75, 1.75], [-1.142, 1.142], this.box), X = sc.x, Y = sc.y, sol = FE.plate(s.mesh, s.src, s.load === "uniform");
      var top = Math.max.apply(null, sol.U.concat([1e-12])), g = p.g(null);
      sol.tris.forEach(function (t) {
        var v = 0;
        t.I.forEach(function (k) { v += k >= 0 ? sol.U[k] : 0; });
        var e = p.poly(g, t.P.map(function (q) { return [X(q[0]), Y(q[1])]; }), "cell", true);
        e.style.fill = "color-mix(in srgb, var(--warm) " + Math.round(8 + 87 * v / 3 / top) + "%, var(--surface))";
        if (s.mesh <= 24) { e.style.stroke = "color-mix(in srgb, var(--ink) 14%, transparent)"; e.style.strokeWidth = "0.6"; }
      });
      p.poly(g, [[-1, -1], [0, -1], [0, 0], [1, 0], [1, 1], [-1, 1]].map(function (q) { return [X(q[0]), Y(q[1])]; }), "curve thin", true);
      p.label("ap-c", "\\text{re-entrant corner}", X(0) + 6, Y(0) + 6, "se");
      p.label("ap-f", "-\\Delta T = q, \\quad T = 0 \\text{ on the edges}", X(0.1), Y(-0.55), "e");
      if (s.load !== "uniform") {
        p.circle(g, X(s.src[0]), Y(s.src[1]), 7, "hollow c-accent");
        p.circle(g, X(s.src[0]), Y(s.src[1]), 18, "hitc");
      }
      return sol.nodes.length + " unknowns on " + sol.tris.length + " triangles &nbsp;·&nbsp; conjugate gradient converged in " + sol.it + " iterations &nbsp;·&nbsp; edges held at 0, hottest point " + num(top, 3);
    }
  };

  // Bregman divergence, negative entropy, KL, cross-entropy, Gibbs' inequality.
  var BR = {};
  BR.phis = {
    sq: { f: function (x) { return x * x; }, d: function (x) { return 2 * x; }, dom: [-1.6, 1.6], tex: "\\varphi(x) = x^2", name: "x²", B: "(<i>p</i> − <i>q</i>)², the squared distance" },
    xlogx: { f: function (x) { return x * Math.log(x); }, d: function (x) { return Math.log(x) + 1; }, dom: [0.03, 2.4], tex: "\\varphi(x) = x \\log x", name: "x log x", B: "<i>p</i> log(<i>p</i>/<i>q</i>) − <i>p</i> + <i>q</i>, one term of a KL divergence" },
    exp: { f: Math.exp, d: Math.exp, dom: [-2.2, 1.3], tex: "\\varphi(x) = e^x", name: "eˣ", B: "e<sup><i>p</i></sup> − e<sup><i>q</i></sup>(1 + <i>p</i> − <i>q</i>)" }
  };
  // φ on the 2-outcome simplex: p = (t, 1 − t).
  BR.ne = function (t) { return t * Math.log(t) + (1 - t) * Math.log(1 - t); };
  BR.dne = function (t) { return Math.log(t / (1 - t)); };
  BR.kl = function (p, q) { return p * Math.log(p / q) + (1 - p) * Math.log((1 - p) / (1 - q)); };
  BR.ce = function (p, q) { return -p * Math.log(q) - (1 - p) * Math.log(1 - q); };
  // P: p(x) = ¾(1 − x²) on [−1, 1]. Q: a jagged density on [−1.7, 1.7],
  // positive wherever p is (so P ≪ Q), optionally with a hole inside [−1, 1].
  BR.p = function (x) { return Math.abs(x) <= 1 ? 0.75 * (1 - x * x) : 0; };
  BR.makeQ = function (seed, hole) {
    var u = RL.uniform(seed * 7919 + 13), bumps = [], i, Z = 0, N = 680, a = -1.7, b = 1.7, dx = (b - a) / N;
    for (i = 0; i < 9; i++) bumps.push([a + 0.15 + (b - a - 0.3) * u(), 0.04 + 0.12 * u(), 0.3 + u()]);
    var raw = function (x) {
      if (x < a || x > b || (hole && x > 0.25 && x < 0.55)) return 0;
      var v = 0.12;
      bumps.forEach(function (m) { v += m[2] * Math.exp(-(x - m[0]) * (x - m[0]) / (2 * m[1] * m[1])); });
      return v;
    };
    for (i = 0; i < N; i++) Z += raw(a + (i + 0.5) * dx) * dx;
    return function (x) { return raw(x) / Z; };
  };
  BR.klPQ = function (q) {
    var s = 0, N = 2000, dx = 2 / N;
    for (var i = 0; i < N; i++) {
      var x = -1 + (i + 0.5) * dx, pv = BR.p(x), qv = q(x);
      if (pv > 0 && qv <= 0) return Infinity;
      if (pv > 0) s += pv * Math.log(pv / qv) * dx;
    }
    return s;
  };
  // Draw p and q over [−2, 2]; returns the scale.
  BR.pq = function (p, q, box, opts) {
    var sc = scale([-2.05, 2.05], [opts && opts.low ? -0.36 : 0, 1.45], box), X = sc.x, Y = sc.y, i, pp = [], qq = [], g = p.g(null, true);
    for (i = 0; i <= 820; i++) {
      var x = -2.05 + 4.1 * i / 820;
      pp.push([X(x), Y(BR.p(x))]);
      qq.push([X(x), Y(Math.min(q(x), 1.42))]);
    }
    p.poly(g, [[X(-1), Y(0)]].concat(pp.filter(function (pt, k) { var x = -2.05 + 4.1 * k / 820; return x >= -1 && x <= 1; }), [[X(1), Y(0)]]), "fill c-accent", true);
    p.poly(g, qq, "curve c-warm");
    p.poly(g, pp, "curve c-accent");
    p.line(g, X(-2.05), Y(0), X(2.05), Y(0), "axisline");
    return sc;
  };
  BR.desc = function (t) { return "<span class=\"fig-desc\">" + t + "</span>"; };
  function prob(key, label, value) { return { key: key, label: label, min: 0.02, max: 0.98, step: 0.01, value: value, show: function (v) { return key.charAt(0) + " = " + num(v); } }; }
  BR.controls = {
    bregman: [{ key: "phi", label: "Convex φ", type: "choice", value: "xlogx", options: [["sq", "x²"], ["xlogx", "x log x"], ["exp", "eˣ"]] }],
    "negative-entropy": [prob("t1", "Distribution", 0.25)],
    "absolute-continuity": [{ key: "ac", label: "Case", type: "choice", value: "covers", options: [["covers", "P ≪ Q"], ["hole", "Q has a hole"], ["bern", "Bernoulli"]] }],
    "kl-divergence": [prob("pk", "p = (p, 1 − p)", 0.25), prob("qk", "q = (q, 1 − q)", 0.6)],
    "cross-entropy": [prob("pc", "True p", 0.3), prob("qc", "Model q", 0.7)],
    nonnegativity: [prob("qn", "Tangent at q", 0.35)],
    "optimal-coding": [{ key: "mix", label: "Code built for", min: 0, max: 1, step: 0.01, value: 0.3, show: function (v) { return v === 1 ? "q = p" : v === 0 ? "q = r" : num(1 - v) + "·r + " + num(v) + "·p"; } }]
  };

  specs["bregman-kl"] = {
    // Card cover: a concave P, a jagged Q with P ≪ Q, and KL(P ‖ Q).
    cover: function (p) {
      var q = BR.makeQ(4, false), sc = BR.pq(p, q, { l: 16, r: 16, t: 88, b: 30 }), X = sc.x, Y = sc.y, g = p.g(null);
      p.big(g, X(0), Y(BR.p(0)) - 16, "P", 64, "c-accent");
      p.big(g, X(-1.45), Y(Math.min(q(-1.45), 1.3)) - 14, "Q", 64, "c-warm");
      p.big(g, 300, 64, "P \u226a Q,  KL(P \u2016 Q) = " + BR.klPQ(q).toFixed(2), 46);
    },
    alt: "Figures for Bregman divergence: a convex function with a tangent line and the gap between them, negative entropy on two outcomes, KL divergence as a tangent gap, cross-entropy as entropy plus KL, tangents under a convex curve, and code lengths for a four-symbol source.",
    story: true,
    controls: function (s) { return BR.controls[s.ch] || []; },
    init: function (s) {
      s.ch = "bregman";
      for (var c in BR.controls) BR.controls[c].forEach(function (o) { s[o.key] = o.value; });
      s.bp = 1.9; s.bq = 0.6; s.qseed = 4;
      this.box = BOX;
    },
    select: function (s, slug) {
      if (!slug || slug === s.ch || !BR.controls[slug]) return false;
      s.ch = slug;
      return true;
    },
    render: function (s, p) { return this[s.ch](s, p); },
    click: function (s) {
      if (s.ch !== "absolute-continuity" || s.ac === "bern") return false;
      s.qseed++;
      return true;
    },
    drag: function (s, pt, phase) {
      var sc = this.sc;
      if (!sc || s.ch !== "bregman") return false;
      var F = BR.phis[s.phi];
      if (phase === "start") {
        s.drag = null;
        var best = 30;
        [["bp", s.bp], ["bq", s.bq]].forEach(function (t) {
          var d = Math.abs(pt.x - sc.x(t[1])) + Math.min(Math.abs(pt.y - sc.y(F.f(t[1]))), Math.abs(pt.y - sc.y(sc.yd[0])));
          if (d < best) { best = d; s.drag = t[0]; }
        });
        return !!s.drag;
      }
      s[s.drag] = clamp(sc.ix(pt.x), F.dom[0] + 0.05, F.dom[1] - 0.05);
    },

    // The definition: the gap at p between φ and its tangent at q.
    bregman: function (s, p) {
      var F = BR.phis[s.phi], a = F.dom[0], b = F.dom[1], i, ys = [];
      if (s.phiSeen !== s.phi) { s.phiSeen = s.phi; s.bq = a + 0.3 * (b - a); s.bp = a + 0.82 * (b - a); }
      var P = s.bp, Q = s.bq;
      for (i = 0; i <= 200; i++) ys.push(F.f(a + (b - a) * i / 200));
      var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys), pad = (hi - lo) * 0.15;
      var sc = this.sc = scale([a - (b - a) * 0.06, b + (b - a) * 0.04], [lo - pad * 2, hi + pad]), X = sc.x, Y = sc.y;
      var tan = function (x) { return F.f(Q) + F.d(Q) * (x - Q); };
      p.axes(sc, { xlabel: "x" });
      var g = p.g(null, true), cv = [];
      for (i = 0; i <= 200; i++) { var x = a + (b - a) * i / 200; cv.push([X(x), Y(F.f(x))]); }
      p.poly(g, cv, "curve c-accent");
      p.line(g, X(a), Y(tan(a)), X(b), Y(tan(b)), "curve thin c-muted dash");
      p.line(g, X(P), Y(tan(P)), X(P), Y(F.f(P)), "curve c-warm");
      var gd = p.g(null);
      p.line(gd, X(P), Y(sc.yd[0]), X(P), Y(Math.min(F.f(P), tan(P))), "curve thin c-muted dash");
      p.line(gd, X(Q), Y(sc.yd[0]), X(Q), Y(F.f(Q)), "curve thin c-muted dash");
      p.circle(gd, X(Q), Y(F.f(Q)), 5.5, "dot");
      p.circle(gd, X(P), Y(F.f(P)), 5.5, "dot c-warm");
      p.circle(gd, X(P), Y(tan(P)), 4, "hollow c-warm");
      [P, Q].forEach(function (v) { p.circle(gd, X(v), Y(F.f(v)), 16, "hitc"); });
      p.label("br-q", "q", X(Q), Y(sc.yd[0]) - 4, "n");
      p.label("br-p", "p", X(P), Y(sc.yd[0]) - 4, "n");
      p.label("br-f-" + s.phi, "y = " + F.tex, X(a + 0.04 * (b - a)), Y(F.f(a + 0.04 * (b - a))) - 6, s.phi === "exp" ? "se" : "ne");
      var tx = Q < (a + b) / 2 ? a + 0.05 * (b - a) : b - 0.05 * (b - a);
      p.label("br-t", "\\text{tangent: } y = \\varphi(q) + \\varphi'(q)(x - q)", X(tx), Y(tan(tx)) + 6, tx < Q ? "se" : "sw");
      p.label("br-B", "B_\\varphi(p, q)", X(P) + (P > Q ? 6 : -6), (Y(tan(P)) + Y(F.f(P))) / 2, P > Q ? "e" : "w");
      var B = F.f(P) - tan(P);
      return BR.desc("The blue curve is the convex function φ(<i>x</i>) = " + F.name + ", the dashed line its tangent at <i>q</i>. The brown segment at <i>p</i>, from the tangent up to the curve, is the Bregman divergence.") +
        "<i>B</i><sub>φ</sub>(<i>p</i>, <i>q</i>) = φ(" + num(P) + ") − [φ(" + num(Q) + ") + φ′(" + num(Q) + ")(" + num(P) + " − " + num(Q) + ")] = " + num(B, 4) +
        " &nbsp;·&nbsp; for this φ it equals " + F.B + ". Drag <i>p</i> and <i>q</i>.";
    },

    // φ(p) = Σ p_i log p_i on two outcomes, and its negative, the entropy.
    "negative-entropy": function (s, p) {
      var t = s.t1, sc = scale([-0.08, 1.12], [-0.85, 0.85]), X = sc.x, Y = sc.y, i, a = [], h = [];
      for (i = 1; i < 200; i++) { var x = i / 200; a.push([X(x), Y(BR.ne(x))]); h.push([X(x), Y(-BR.ne(x))]); }
      p.axes(sc, { xticks: [0.5, 1], yticks: [-0.5, 0.5], xlabel: "p_1" });
      var g = p.g(null);
      p.poly(g, h, "curve thin c-muted dash");
      p.poly(g, a, "curve c-accent");
      p.line(g, X(0.5), Y(-Math.log(2)), X(0.5), Y(Math.log(2)), "curve thin c-muted dash");
      p.circle(g, X(t), Y(BR.ne(t)), 5.5, "dot c-accent");
      p.label("ne-f", "\\varphi(p) = p_1 \\log p_1 + p_2 \\log p_2", X(0.5), Y(-Math.log(2)) + 8, "s");
      p.label("ne-h", "H(p) = -\\varphi(p)", X(0.5), Y(Math.log(2)) - 6, "n");
      p.label("ne-m", "-\\log 2", X(0.5) + 6, Y(-Math.log(2)), "e");
      var g1 = Math.log(t) + 1, g2 = Math.log(1 - t) + 1;
      return BR.desc("For two outcomes, <i>p</i> = (<i>p</i><sub>1</sub>, 1 − <i>p</i><sub>1</sub>). The blue curve is the negative entropy φ, which is convex and ≤ 0; the dashed curve is the entropy <i>H</i> = −φ. Both are extreme at the uniform distribution.") +
        "<i>p</i> = (" + num(t) + ", " + num(1 - t) + "): φ(<i>p</i>) = " + num(BR.ne(t), 4) + ", <i>H</i>(<i>p</i>) = " + num(-BR.ne(t), 4) + " nats &nbsp;·&nbsp; ∇φ(<i>p</i>) = (log <i>p<sub>i</sub></i> + 1) = (" + num(g1, 3) + ", " + num(g2, 3) + ")";
    },

    // KL(p ‖ q) is the Bregman gap of the negative entropy.
    "kl-divergence": function (s, p) {
      var P = s.pk, Q = s.qk, sc = scale([-0.08, 1.12], [-0.95, 0.75]), X = sc.x, Y = sc.y, i, a = [];
      var tan = function (x) { return BR.ne(Q) + BR.dne(Q) * (x - Q); };
      for (i = 1; i < 200; i++) { var x = i / 200; a.push([X(x), Y(BR.ne(x))]); }
      p.axes(sc, { xticks: [0.5, 1], xlabel: "p_1" });
      var g = p.g(null, true);
      p.poly(g, a, "curve c-accent");
      p.line(g, X(0), Y(tan(0)), X(1), Y(tan(1)), "curve thin c-muted dash");
      p.line(g, X(P), Y(tan(P)), X(P), Y(BR.ne(P)), "curve c-warm");
      var gd = p.g(null);
      p.circle(gd, X(Q), Y(BR.ne(Q)), 5.5, "dot");
      p.circle(gd, X(P), Y(BR.ne(P)), 5.5, "dot c-warm");
      p.label("kl-q", "q", X(Q), Y(BR.ne(Q)) + 8, "s");
      p.label("kl-p", "p", X(P), Y(BR.ne(P)) + 8, "s");
      p.label("kl-f", "y = \\textstyle\\sum_i p_i \\log p_i", X(0.04), Y(BR.ne(0.04)) - 4, "ne");
      p.label("kl-t", "\\text{tangent at } q", X(Q < 0.5 ? 0.97 : 0.03), Y(tan(Q < 0.5 ? 0.97 : 0.03)) + 6, Q < 0.5 ? "sw" : "se");
      p.label("kl-B", "\\text{KL}(p \\,\\Vert\\, q)", X(P) + (P > Q ? 6 : -6), (Y(tan(P)) + Y(BR.ne(P))) / 2, P > Q ? "e" : "w");
      return BR.desc("The blue curve is the negative entropy of (<i>p</i><sub>1</sub>, 1 − <i>p</i><sub>1</sub>), the dashed line its tangent at <i>q</i>. The brown gap at <i>p</i> is the Bregman divergence, and it equals the KL divergence.") +
        "gap = " + num(BR.ne(P) - tan(P), 4) + " &nbsp;·&nbsp; Σ <i>p<sub>i</sub></i> log(<i>p<sub>i</sub></i>/<i>q<sub>i</sub></i>) = " + num(BR.kl(P, Q), 4) +
        " &nbsp;·&nbsp; swapped, KL(<i>q</i> ‖ <i>p</i>) = " + num(BR.kl(Q, P), 4) + ": not symmetric";
    },

    // Which direction? P ≪ Q makes KL(P ‖ Q) finite.
    "absolute-continuity": function (s, p) {
      if (s.ac === "bern") {
        var sc = scale([-0.6, 2.6], [0, 1.25]), X = sc.x, Y = sc.y, g = p.g(null);
        p.axes(sc, { yticks: [0.5, 1] });
        [[0, 0.5, 0], [1, 0.5, 1]].forEach(function (t) {
          var c = t[0] + 0.5;
          p.rect(g, X(c - 0.34), Y(t[1]), 0.32 * sc.sx, t[1] * sc.sy, "fill c-accent");
          p.rect(g, X(c - 0.34), Y(t[1]), 0.32 * sc.sx, t[1] * sc.sy, "curve thin c-accent");
          if (t[2] > 0) {
            p.rect(g, X(c + 0.02), Y(t[2]), 0.32 * sc.sx, t[2] * sc.sy, "fill c-warm");
            p.rect(g, X(c + 0.02), Y(t[2]), 0.32 * sc.sx, t[2] * sc.sy, "curve thin c-warm");
          } else p.line(g, X(c + 0.02), Y(0), X(c + 0.34), Y(0), "curve c-warm");
          p.text(g, X(c), Y(0) + 20, "x = " + t[0]);
        });
        p.label("ab-p", "\\text{blue: } P = \\text{Bernoulli}(0.5)", X(1.05), Y(1.2), "se");
        p.label("ab-q", "\\text{brown: } Q = \\text{Bernoulli}(1)", X(1.05), Y(1.08), "se");
        p.label("ab-0", "q(0) = 0 < p(0)", X(0.68), Y(0) - 8, "n");
        return BR.desc("Two coin flips. P is fair (blue); Q always lands 1 (brown), so it puts no mass on x = 0, where P puts half.") +
          "KL(<i>P</i> ‖ <i>Q</i>) = 0.5 log(0.5/0) + 0.5 log(0.5/1) = +∞ &nbsp;·&nbsp; KL(<i>Q</i> ‖ <i>P</i>) = 0 · log(0/0.5) + 1 · log(1/0.5) = log 2 ≈ 0.693, finite because <i>Q</i> ≪ <i>P</i>";
      }
      var hole = s.ac === "hole", q = BR.makeQ(s.qseed, hole), sc2 = BR.pq(p, q, BOX, { low: true }), X2 = sc2.x, Y2 = sc2.y, gs = p.g(null);
      p.line(gs, X2(-1), Y2(-0.13), X2(1), Y2(-0.13), "curve c-accent");
      p.line(gs, X2(-1.7), Y2(-0.27), X2(1.7), Y2(-0.27), "curve c-warm");
      p.label("ab-sp", "\\operatorname{supp} P", X2(1) + 6, Y2(-0.13), "e");
      p.label("ab-sq", "\\operatorname{supp} Q", X2(-1.7) - 6, Y2(-0.27), "w");
      p.label("ab-pf", "p(x) = \\tfrac34 (1 - x^2)", X2(-0.55), Y2(BR.p(-0.55)) - 8, "e");
      p.label("ab-qf", "q(x)", X2(-1.55), Y2(Math.min(q(-1.55), 1.3)) - 6, "n");
      if (hole) {
        var gh = p.g(null);
        p.rect(gh, X2(0.25), Y2(1.42), X2(0.55) - X2(0.25), Y2(0) - Y2(1.42), "fill c-warm");
        p.label("ab-h", "q = 0 < p", X2(0.4), Y2(1.38), "s");
      }
      var kl = BR.klPQ(q);
      return BR.desc("Blue: the target P, a concave density on [−1, 1]. Brown: a model Q, jagged and unlike P, spread over [−1.7, 1.7]. " +
        (hole ? "Here Q is zero on a strip (shaded) where P has mass, so P ≪ Q fails." : "Q is positive wherever P is, so P ≪ Q.")) +
        "KL(<i>P</i> ‖ <i>Q</i>) = " + (kl === Infinity ? "+∞" : num(kl, 3)) + " &nbsp;·&nbsp; KL(<i>Q</i> ‖ <i>P</i>) = +∞, since Q has mass outside [−1, 1] where p = 0 &nbsp;·&nbsp; <span class=\"muted\">Tap the figure for another random Q.</span>";
    },

    // Cross-entropy = entropy + KL; minimized over q at q = p.
    "cross-entropy": function (s, p) {
      var P = s.pc, Q = s.qc, sc = scale([-0.08, 1.12], [0, 3.1]), X = sc.x, Y = sc.y, i, c = [], H = -BR.ne(P);
      for (i = 2; i < 199; i++) { var q = i / 200; c.push([X(q), Y(Math.min(BR.ce(P, q), 3.05))]); }
      p.axes(sc, { xticks: [0.5, 1], yticks: [1, 2, 3], xlabel: "q_1" });
      var g = p.g(null, true), band = [];
      for (i = 2; i < 199; i++) { var q2 = i / 200; band.push([X(q2), Y(Math.min(BR.ce(P, q2), 3.05))]); }
      p.poly(g, [[X(0.01), Y(H)]].concat(band, [[X(0.995), Y(H)]]), "fill c-warm", true);
      p.line(g, X(0), Y(H), X(1), Y(H), "curve thin c-muted dash");
      p.poly(g, c, "curve c-accent");
      p.line(g, X(Q), Y(H), X(Q), Y(BR.ce(P, Q)), "curve c-warm");
      p.line(g, X(P), Y(0), X(P), Y(H), "curve thin c-muted dash");
      p.circle(g, X(Q), Y(BR.ce(P, Q)), 5.5, "dot c-accent");
      p.circle(g, X(P), Y(H), 4.5, "dot");
      p.label("ce-f", "\\text{CE}(p, q) = -\\textstyle\\sum_i p_i \\log q_i", X(Q < 0.5 ? 0.97 : 0.03), Y(Math.min(BR.ce(P, Q < 0.5 ? 0.97 : 0.03), 2.9)), Q < 0.5 ? "nw" : "ne");
      p.label("ce-h", "H(p) = -\\textstyle\\sum_i p_i \\log p_i", X(0.98), Y(H) + 6, "sw");
      p.label("ce-k", "\\text{KL}(p \\,\\Vert\\, q)", X(Q) + 6, (Y(H) + Y(BR.ce(P, Q))) / 2, "e");
      p.label("ce-p", "q = p", X(P), Y(0) + 4, "s");
      return BR.desc("For a fixed true distribution <i>p</i>, the blue curve is the cross-entropy as the model <i>q</i> varies. The dashed line is the entropy <i>H</i>(<i>p</i>), a constant; the brown gap between them is KL(<i>p</i> ‖ <i>q</i>).") +
        "CE = " + num(BR.ce(P, Q), 4) + " = <i>H</i>(<i>p</i>) " + num(H, 4) + " + KL " + num(BR.kl(P, Q), 4) + " &nbsp;·&nbsp; minimizing CE over <i>q</i> is minimizing KL: the minimum is at <i>q</i> = <i>p</i>";
    },

    // Convexity: every tangent lies below the curve, so B ≥ 0.
    nonnegativity: function (s, p) {
      var Q = s.qn, sc = scale([-0.08, 1.12], [-0.95, 0.6]), X = sc.x, Y = sc.y, i, a = [], epi = [];
      for (i = 1; i < 200; i++) { var x = i / 200; a.push([X(x), Y(BR.ne(x))]); }
      p.axes(sc, { xticks: [0.5, 1], xlabel: "p_1" });
      var g = p.g(null, true);
      p.poly(g, [[X(0.005), Y(0.6)]].concat(a, [[X(0.995), Y(0.6)]]), "fill c-accent", true);
      [0.1, 0.2, 0.5, 0.65, 0.8, 0.9].forEach(function (q) {
        p.line(g, X(0), Y(BR.ne(q) - BR.dne(q) * q), X(1), Y(BR.ne(q) + BR.dne(q) * (1 - q)), "curve thin c-muted");
      });
      var tan = function (x) { return BR.ne(Q) + BR.dne(Q) * (x - Q); }, d2 = 1 / (Q * (1 - Q)), quad = [];
      for (i = 0; i <= 200; i++) { var z = i / 200; quad.push([X(z), Y(tan(z) + 0.5 * d2 * (z - Q) * (z - Q))]); }
      p.poly(g, quad, "curve thin c-warm dash");
      p.line(g, X(0), Y(tan(0)), X(1), Y(tan(1)), "curve c-warm");
      p.poly(g, a, "curve c-accent");
      p.circle(g, X(Q), Y(BR.ne(Q)), 5.5, "dot");
      p.label("nn-f", "y = \\varphi(p)", X(0.5), Y(BR.ne(0.5)) + 8, "s");
      p.label("nn-e", "\\text{epigraph } \\{ y \\ge \\varphi \\}", X(0.5), Y(0.56), "s");
      var gl = p.g(null);
      p.line(gl, X(0.04), Y(0.3), X(0.12), Y(0.3), "curve c-warm");
      p.line(gl, X(0.04), Y(0.18), X(0.12), Y(0.18), "curve thin c-warm dash");
      p.label("nn-t", "\\text{tangent: } \\varphi(q) + \\varphi'(q)(p - q)", X(0.13), Y(0.3), "e");
      p.label("nn-q", "\\text{Taylor: } \\ldots + \\tfrac12 \\varphi''(q)(p - q)^2", X(0.13), Y(0.18), "e");
      return BR.desc("The blue curve is the convex φ with its epigraph shaded. Every tangent (gray lines, brown for the one at <i>q</i>) stays below the curve, so the gap <i>B</i><sub>φ</sub>(<i>p</i>, <i>q</i>) is never negative. The dashed brown curve is the second-order Taylor expansion at <i>q</i>.") +
        "φ″(<i>q</i>) = 1/(<i>q</i>(1 − <i>q</i>)) = " + num(d2, 2) + " &gt; 0 &nbsp;·&nbsp; so near <i>q</i>, <i>B</i><sub>φ</sub>(<i>p</i>, <i>q</i>) ≈ ½φ″(<i>q</i>)(<i>p</i> − <i>q</i>)² ≥ 0, with equality only at <i>p</i> = <i>q</i>";
    },

    // Code lengths ℓ_i = −log₂ q_i for a four-symbol source with distribution p.
    "optimal-coding": function (s, p) {
      var P = [0.5, 0.25, 0.125, 0.125], R = [0.1, 0.15, 0.3, 0.45], t = s.mix, i;
      var Qd = P.map(function (v, k) { return (1 - t) * R[k] + t * v; });
      var sc = scale([-0.3, 4.3], [0, 0.72]), X = sc.x, Y = sc.y, g = p.g(null), H = 0, CE = 0;
      p.axes(sc, { yticks: [0.25, 0.5], ylabel: "\\text{probability}" });
      for (i = 0; i < 4; i++) {
        H -= P[i] * Math.log2(P[i]); CE -= P[i] * Math.log2(Qd[i]);
        var c = i + 0.5;
        p.rect(g, X(c - 0.36), Y(P[i]), 0.34 * sc.sx, P[i] * sc.sy, "fill c-accent");
        p.rect(g, X(c - 0.36), Y(P[i]), 0.34 * sc.sx, P[i] * sc.sy, "curve thin c-accent");
        p.rect(g, X(c + 0.02), Y(Qd[i]), 0.34 * sc.sx, Qd[i] * sc.sy, "fill c-warm");
        p.rect(g, X(c + 0.02), Y(Qd[i]), 0.34 * sc.sx, Qd[i] * sc.sy, "curve thin c-warm");
        p.text(g, X(c), Y(0) + 20, "ABCD".charAt(i));
        p.text(g, X(c + 0.19), Y(Qd[i]) - 8, num(-Math.log2(Qd[i]), 2) + " bits");
      }
      p.label("oc-p", "\\text{blue: } p_i \\ (\\text{true})", X(2.6), Y(0.68), "se");
      p.label("oc-q", "\\text{brown: } q_i, \\ \\ell_i = -\\log_2 q_i", X(2.6), Y(0.6), "se");
      return BR.desc("A source emits A–D with probabilities <i>p</i> (blue). A code built for a guess <i>q</i> (brown) gives symbol <i>i</i> a codeword of about −log₂ <i>q<sub>i</sub></i> bits, written above each brown bar.") +
        "expected length Σ <i>p<sub>i</sub></i>(−log₂ <i>q<sub>i</sub></i>) = " + num(CE, 3) + " bits ≥ entropy <i>H</i>(<i>p</i>) = " + num(H, 3) + " bits &nbsp;·&nbsp; waste = KL(<i>p</i> ‖ <i>q</i>) = " + num(CE - H, 3) + " bits, zero only when <i>q</i> = <i>p</i>";
    }
  };

  // ---------- one-sentence descriptions shown above each readout ----------
  function byBlock(map) { return function (s) { var d = map[s.ch]; return typeof d === "function" ? d(s) : d; }; }

  specs["riemann-integral"].describe = function () {
    return "The black curve is y = x² on [0, 1]. Each bar has width Δx = 1/n and the height of the curve at its sample point (dot); together the bars make the Riemann sum S<sub><i>n</i></sub>. The shaded region under the curve is the exact area.";
  };
  specs.diagonalization.describe = function () {
    return "Gray grid and dashed circle: the plane and the unit circle before the map. Slanted grid and blue ellipse: their images under <i>A<sub>t</sub></i> = (1 − <i>t</i>)<i>I</i> + <i>tA</i>. The dashed brown diagonals are the eigenlines <b>v</b><sub>1</sub>, <b>v</b><sub>2</sub>; the brown arrows are the parts of <b>x</b> along them, stretched by λ<sub>1</sub> and λ<sub>2</sub>.";
  };
  specs["bayes-rule"].describe = function () {
    return "Densities over the coin's bias θ: the prior (dashed gray), the likelihood of the observed flips rescaled to area 1 (dotted brown), and the posterior (blue), which is proportional to prior × likelihood.";
  };
  specs["least-squares"].describe = function () {
    return "Black dots: the data (<i>x<sub>i</sub></i>, <i>y<sub>i</sub></i>). Blue line: the least-squares fit, with hollow dots at the predictions ŷ<sub><i>i</i></sub>. Brown segments are the residuals <i>r<sub>i</sub></i> = <i>y<sub>i</sub></i> − ŷ<sub><i>i</i></sub>, and each brown square has area <i>r<sub>i</sub></i>²; the line makes their total area as small as possible.";
  };

  specs["gradient-descent"].describe = byBlock({
    objective: "Contour lines of the valley <i>f</i>, 25 times steeper across than along. The cross is the minimizer <b>x</b>*, the black dot the start <b>x</b><sub>0</sub>.",
    gradient: "Gray arrows: the downhill direction −∇<i>f</i> on a grid. Brown arrow: ∇<i>f</i>(<b>x</b><sub>0</sub>) at unit length, perpendicular to the contour through <b>x</b><sub>0</sub>.",
    "gradient-descent": "Contours of <i>f</i>. Blue: the gradient-descent path from <b>x</b><sub>0</sub>, one dot per step.",
    momentum: "Contours of <i>f</i>. Blue: the momentum path from <b>x</b><sub>0</sub>, one dot per step. Dashed gray: gradient descent, the method it improves on.",
    nesterov: "Contours of <i>f</i>. Blue: the Nesterov path. Dashed gray: heavy-ball momentum with the same η and β.",
    rmsprop: "Contours of <i>f</i>. Blue: the RMSProp path. Dashed gray: gradient descent.",
    adam: "Contours of <i>f</i>. Blue: the Adam path. Dashed gray: RMSProp.",
    adamw: "Contours of <i>f</i>. Blue: the AdamW path. Dashed gray: Adam without weight decay. The dot at the origin is where the decay pulls.",
    muon: "Contours of <i>f</i>. Blue: the Muon path. Dashed gray: Adam."
  });

  specs["high-dimension"].describe = byBlock({
    "unit-norm": "Blue: the exact density of ‖<i>u</i>‖² for <i>u</i> with <i>n</i> independent N(0, 1/<i>n</i>) entries. Brown tails: the probability that ‖<i>u</i>‖² misses 1 by at least ε.",
    orthogonal: "Blue: the density of the angle θ between two independent random directions in ℝ<sup><i>n</i></sup>. Brown tails: the angles with |cos θ| ≥ ε, that is, not nearly perpendicular.",
    jl: "Histogram of the 435 ratios ‖<i>Qv<sub>i</sub></i> − <i>Qv<sub>j</sub></i>‖² / ‖<i>v<sub>i</sub></i> − <i>v<sub>j</sub></i>‖² for 30 random points projected from ℝ<sup>200</sup> to ℝ<sup><i>n</i></sup>. The brown band is 1 ± ε.",
    "corner-spheres": "A 2-D drawing of the <i>n</i>-dimensional setup: gray unit spheres centered at the corners (±1, …, ±1) of the box [−2, 2]<sup><i>n</i></sup>, and the inner sphere drawn at its true radius √<i>n</i> − 1 (blue, brown once it leaves the box).",
    "ball-volume": "Bars: the volume <i>V<sub>n</sub></i> of the unit ball in ℝ<sup><i>n</i></sup> for <i>n</i> = 0, …, 20, with the selected <i>n</i> in blue. The brown arc is the step <i>V<sub>n</sub></i> = (2π/<i>n</i>)<i>V</i><sub><i>n</i>−2</sub>.",
    shell: "Blue: the density <i>n r</i><sup><i>n</i>−1</sup> of the distance from the center of a uniform random point in the unit <i>n</i>-ball. The brown area is the share of the volume within ε of the surface."
  });

  specs.grpo.describe = byBlock({
    introduction: "One question, <i>G</i> sampled answers <i>o<sub>i</sub></i>. Dots: each answer's reward <i>r<sub>i</sub></i> (filled = correct). Bars: the group-normalized advantage Â<sub><i>i</i></sub>; blue pushes an answer up, brown pushes it down.",
    preliminaries: "The running example as a state diagram: states A and B, arrows labelled with each action's probability and reward, and the state values <i>V</i><sup>π</sup> inside the circles.",
    "build-the-model": "Bar <i>t</i> has height (1 − γ)γ<sup><i>t</i></sup>, the weight of time <i>t</i> in the visitation distribution. Its blue part is the chance of being in B at time <i>t</i> when starting from A; the blue parts add up to 𝒱<sup>π</sup>(B).",
    "is-it-solvable": "Black: the true objective <i>J</i>(θ′). Blue: the surrogate <i>L</i><sub>θ</sub>(θ′), built from samples of the current policy θ (black dot). Gray band: the trust region KL ≤ δ. Blue dot: the surrogate's best point in the band; ring: the true <i>J</i> there.",
    trpo: "Gray lines: level sets of the linear objective <i>g</i>ᵀ<i>x</i>. Gray ellipse: the trust region ½<i>x</i>ᵀ<i>Hx</i> ≤ δ. Brown: the gradient <i>g</i>. Blue: TRPO's step, where a level line touches the ellipse; gray arrow: a step along <i>g</i> to the boundary.",
    "conjugate-gradient": "Contours of φ(<i>x</i>) = ½<i>x</i>ᵀ<i>Hx</i> − <i>g</i>ᵀ<i>x</i>, centered at the solution <i>x</i> = <i>H</i>⁻¹<i>g</i>. Brown: steepest descent with exact line search. Blue: conjugate gradient.",
    "line-search": "Black: the true objective <i>J</i>(θ′). The marks on it are the candidates θ<sub><i>k</i></sub> + α<sup><i>i</i></sup>·(full TRPO step) for <i>i</i> = 0, 1, 2, …: brown rings are rejected, the blue dot is the first one accepted.",
    ppo: "Black: <i>J</i>(θ′). Blue: the surrogate <i>L</i><sub>θ</sub>(θ′). Gray band: the trust region. Blue dot: the exact solution of the trust-region problem; brown ring: where TRPO's approximate step lands.",
    "ppo-penalty": "Black: <i>J</i>(θ′). Blue: the surrogate <i>L</i><sub>θ</sub>(θ′). Brown: the penalized objective <i>L</i><sub>θ</sub>(θ′) − β·KL. Brown dot: its maximizer; ring: the true <i>J</i> there.",
    "ppo-clip": "The PPO-Clip objective for one sample as a function of the probability ratio <i>r</i>: blue min{<i>r</i>Â, clip(<i>r</i>, 1 − ε, 1 + ε)Â}, dashed the unclipped <i>r</i>Â. In the gray region the objective is flat, so its gradient is 0."
  });

  specs.rope.describe = byBlock({
    "relative-position": "Cell (<i>m</i>, <i>n</i>) is colored by the attention score ⟨<i>f</i>(<i>q</i>, <i>m</i>), <i>f</i>(<i>k</i>, <i>n</i>)⟩ between <i>q</i> at position <i>m</i> (rows) and <i>k</i> at position <i>n</i> (columns). The dashed line is <i>m</i> = <i>n</i>.",
    length: "The complex plane. Gray: <i>q</i> and <i>k</i>. Blue and brown: <i>f</i>(<i>q</i>, <i>m</i>) = <i>q</i>e<sup><i>imθ</i></sup> and <i>f</i>(<i>k</i>, <i>m</i>), rotated by <i>m</i>θ. The dashed circles have radius ‖<i>q</i>‖ and ‖<i>k</i>‖.",
    angle: "Each dot is one more rotation by θ: <i>f</i>(<i>q</i>, 0), <i>f</i>(<i>q</i>, 1), …, <i>f</i>(<i>q</i>, <i>m</i>) along the blue arc of angle <i>m</i>θ, and the same for <i>k</i> in brown.",
    "embedding-form": "Gray: <i>q</i> and <i>k</i>. Blue: <i>q</i> rotated by <i>m</i>θ (position <i>m</i>). Brown: <i>k</i> rotated by <i>n</i>θ (position <i>n</i>). The black arc is the angle between the rotated vectors, which sets the score.",
    frequencies: "One dial per pair <i>i</i> = 1, …, <i>d</i>/2. At position <i>m</i>, the hand of dial <i>i</i> has turned by <i>m</i>θ<sub><i>i</i></sub> with θ<sub><i>i</i></sub> = 10000<sup>−2(<i>i</i>−1)/<i>d</i></sup>: blue dials are fast, black medium, brown slow."
  });

  specs.fem.describe = byBlock({
    "strong-form": "Blue: the exact solution <i>u</i>. Brown: the load <i>f</i> = −<i>u</i>″, scaled by 1/25 to fit. Both vanish at the ends, matching the boundary conditions.",
    "weak-form": "Dashed: a test function <i>v</i>, a bump with center <i>c</i> and width <i>w</i>. Blue: the integrand <i>u</i>′<i>v</i>′. Brown: the integrand <i>f v</i>. The weak form says the two shaded areas are equal.",
    "lax-milgram": "Bar <i>k</i> is the energy ratio <i>a</i>(φ<sub><i>k</i></sub>, φ<sub><i>k</i></sub>)/‖φ<sub><i>k</i></sub>′‖² = 1 + <i>c</i>/(<i>k</i>π)² of the mode φ<sub><i>k</i></sub> = sin <i>k</i>π<i>x</i>. The dashed line is the coercivity constant α; a brown bar has negative energy.",
    galerkin: "A 2-D model of the solution space with the energy inner product. Gray line: the subspace <i>V<sub>h</sub></i>. Blue dot: the Galerkin solution <i>u<sub>h</sub></i>. Dashed ellipse: all points at <i>u<sub>h</sub></i>'s energy distance from <i>u</i>. Gray ring: the ordinary orthogonal projection.",
    "finite-elements": "Gray tents: the hat functions φ<sub><i>i</i></sub>, with the selected one in brown. Black: the exact <i>u</i>. Blue: its interpolant Σ <i>u</i>(<i>x<sub>i</sub></i>)φ<sub><i>i</i></sub>, which matches <i>u</i> at the nodes.",
    assembly: "Top: the mesh with nodes 0, …, <i>N</i>; the brown element is selected. Below: the stiffness matrix <i>K</i> (times <i>h</i>), with the entries that element contributes outlined in brown.",
    solve: "Black: the exact solution <i>u</i>. Blue: the finite element solution <i>u<sub>h</sub></i>, linear between the nodes (dots).",
    convergence: "Measured errors versus mesh size <i>h</i> on log–log axes: brown the energy error ‖(<i>u</i> − <i>u<sub>h</sub></i>)′‖, blue the L² error ‖<i>u</i> − <i>u<sub>h</sub></i>‖. The large dots mark the selected <i>N</i>.",
    application: function (s) {
      return "Temperature <i>T</i> in an L-shaped plate whose edges are held at <i>T</i> = 0, solving −Δ<i>T</i> = <i>q</i>: darker brown is hotter. Each triangle is one linear element" + (s.load === "uniform" ? ", and the heat source is uniform." : "; the ring is the hot spot.");
    }
  });

  // The normal distribution from 1-D to 3-D, then any n, then quantum mechanics.
  var ND = {};
  ND.phi = function (x, m, s) { return Math.exp(-(x - m) * (x - m) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI)); };
  ND.cloud = function () {
    if (ND.pts) return ND.pts;
    var rnd = HD.rng(21), pts = [];
    for (var i = 0; i < 4000; i++) { var v = [rnd(), rnd(), rnd()]; pts.push({ v: v, r: Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) }); }
    return (ND.pts = pts);
  };
  ND.flat = function () {
    if (ND.pts2) return ND.pts2;
    var rnd = HD.rng(33), pts = [];
    for (var i = 0; i < 1200; i++) pts.push([rnd(), rnd()]);
    return (ND.pts2 = pts);
  };
  // P(‖X‖ ≤ r) for X ~ N(0, I_n): the chi distribution's CDF.
  ND.inside = function (n, r) { return HD.gammaP(n / 2, r * r / 2); };
  ND.hermite = function (n, y) { var a = 1, b = 2 * y; if (!n) return a; for (var k = 1; k < n; k++) { var c = 2 * y * b - 2 * k * a; a = b; b = c; } return b; };
  ND.psi = function (n, x, w) {
    var f = 1; for (var k = 2; k <= n; k++) f *= k;
    return Math.pow(w / Math.PI, 0.25) / Math.sqrt(Math.pow(2, n) * f) * ND.hermite(n, Math.sqrt(w) * x) * Math.exp(-w * x * x / 2);
  };
  // Rotatable 3-D point cloud drawn on a canvas laid over the figure's stage
  // (adapted from gaussian-cloud.js). One per stage; it animates only while
  // its block is shown.
  ND.gauss = function () {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  ND.sample = function (n) {
    var pts = [], c = [0, 0, 0];
    for (var i = 0; i < n; i++) {
      var x = ND.gauss(), y = ND.gauss(), z = ND.gauss(), r = Math.sqrt(x * x + y * y + z * z);
      pts.push([x, y, z, r]);
      if (r < 1) c[0]++; if (r < 2) c[1]++; if (r < 3) c[2]++;
    }
    return { pts: pts, inside: c.map(function (k) { return k / n; }) };
  };
  ND.widget = function (stage) {
    if (stage._gc) return stage._gc;
    var cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    cv.className = "gc-canvas";
    cv.setAttribute("aria-label", "Rotatable 3-D point cloud. Drag to rotate, scroll or pinch to zoom.");
    stage.insertBefore(cv, stage.querySelector(".fig-labels"));
    var zoomBar = document.createElement("div");
    zoomBar.className = "gc-zoom";
    [["+", "Zoom in", 1.25], ["−", "Zoom out", 0.8], ["⟲", "Reset view", 0]].forEach(function (b) {
      var btn = document.createElement("button");
      btn.type = "button"; btn.textContent = b[0]; btn.setAttribute("aria-label", b[1]); btn.title = b[1];
      btn.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
      btn.addEventListener("pointerup", function (e) { e.stopPropagation(); });
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (b[2]) g.zoom = clamp(g.zoom * b[2], 0.5, 4);
        else { g.zoom = 1; g.R = ND.start(); g.w = [0, 0.004, 0]; }
      });
      zoomBar.appendChild(btn);
    });
    stage.appendChild(zoomBar);

    // Orientation R (rows = view axes: right, up, toward the viewer), angular
    // velocity w (radians per frame, in view coordinates) and zoom.
    var g = { cv: cv, bar: zoomBar, active: false, running: false, spin: true, pts: [], R: ND.start(), w: [0, 0.004, 0], zoom: 1 };
    var ptrs = {}, last = null, pinch = 0, W = 0, H = 0;
    function turn(axis, ang) {
      var n = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
      if (n < 1e-9 || !ang) return;
      var x = axis[0] / n, y = axis[1] / n, z = axis[2] / n, c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
      var M = [[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
      g.R = M.map(function (row) { return [0, 1, 2].map(function (j) { return row[0] * g.R[0][j] + row[1] * g.R[1][j] + row[2] * g.R[2][j]; }); });
    }
    function count() { return Object.keys(ptrs).length; }
    function spread() { var k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
    cv.addEventListener("pointerdown", function (e) {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      cv.setPointerCapture(e.pointerId);
      if (count() === 2) pinch = spread();
      last = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    cv.addEventListener("pointermove", function (e) {
      if (!ptrs[e.pointerId]) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (count() === 2) {
        var d = spread();
        if (pinch) g.zoom = clamp(g.zoom * d / pinch, 0.5, 4);
        pinch = d;
        return;
      }
      if (!last) return;
      // Dragging by (dx, dy) turns the ball about the axis perpendicular to the
      // drag, so the near side follows the pointer.
      var dx = e.clientX - last.x, dy = e.clientY - last.y, ang = Math.hypot(dx, dy) * 0.008;
      turn([dy, dx, 0], ang);
      var dt = Math.max(performance.now() - last.t, 1) / 16.7, k = ang / dt;
      g.w = ang ? [dy / Math.hypot(dx, dy) * k, dx / Math.hypot(dx, dy) * k, 0] : g.w;
      last = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    function up(e) {
      delete ptrs[e.pointerId];
      if (count() < 2) pinch = 0;
      if (!count()) last = null;
      else { var k = Object.keys(ptrs)[0]; last = { x: ptrs[k].x, y: ptrs[k].y, t: performance.now() }; }
    }
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", function (e) {
      e.preventDefault();
      g.zoom = clamp(g.zoom * Math.exp(-e.deltaY * 0.0015), 0.5, 4);
    }, { passive: false });

    function size() {
      var dpr = window.devicePixelRatio || 1, w = stage.clientWidth, h = stage.clientHeight;
      if (w !== W || h !== H) { W = w; H = h; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    }
    function frame() {
      if (!g.active || !cv.isConnected || !cv.offsetParent) { g.running = false; return; }
      size();
      var held = last && count() === 1;
      if (!held) {
        // After a release the ball keeps the spin you gave it, easing down to
        // a slow drift in the same direction (or stopping when paused).
        var sp = Math.hypot(g.w[0], g.w[1], g.w[2]), base = g.spin ? 0.004 : 0;
        if (sp > 1e-6) {
          var target = Math.max(base, sp * 0.96);
          if (sp < base) target = Math.min(base, sp + 0.0002);
          g.w = g.w.map(function (v) { return v / sp * target; });
          turn(g.w, target);
        } else if (base) g.w = [0, base, 0];
      }
      var css = getComputedStyle(stage), col = function (n) { return css.getPropertyValue(n).trim(); };
      var focus = col("--focus"), ink = col("--ink"), warm = col("--warm"), muted = col("--muted");
      ctx.clearRect(0, 0, W, H);
      var sc = Math.min(W, H) / 7.4 * g.zoom, cx = W / 2, cy = H / 2, D = 14, R = g.R;
      var proj = g.pts.map(function (q) {
        var x = R[0][0] * q[0] + R[0][1] * q[1] + R[0][2] * q[2];
        var y = R[1][0] * q[0] + R[1][1] * q[1] + R[1][2] * q[2];
        var z = R[2][0] * q[0] + R[2][1] * q[1] + R[2][2] * q[2], f = D / (D - z);
        return [cx + x * f * sc, cy - y * f * sc, z, q[3], f];
      }).sort(function (a, b) { return a[2] - b[2]; });
      ctx.setLineDash([4, 5]); ctx.lineWidth = 1; ctx.strokeStyle = muted; ctx.fillStyle = muted;
      ctx.font = "13px system-ui, sans-serif";
      [1, 2, 3].forEach(function (k) {
        ctx.beginPath(); ctx.arc(cx, cy, k * sc, 0, 2 * Math.PI); ctx.stroke();
        ctx.fillText(k + "σ", cx + k * sc * 0.707 + 4, cy - k * sc * 0.707 - 4);
      });
      ctx.setLineDash([]);
      var dot = Math.min(2.2, 0.9 + 0.35 * g.zoom);
      for (var i = 0; i < proj.length; i++) {
        var q = proj[i], d = (q[2] + 3.5) / 7;
        ctx.globalAlpha = Math.max(0.15, Math.min(0.9, 0.25 + 0.6 * d)) * (q[3] < 1 ? 1 : q[3] < 2 ? 0.7 : 0.85);
        ctx.fillStyle = q[3] < 1 ? focus : q[3] < 2 ? ink : warm;
        ctx.beginPath(); ctx.arc(q[0], q[1], (dot + 0.9 * d) * q[4], 0, 2 * Math.PI); ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    g.show = function (on) {
      g.active = on;
      cv.hidden = !on;
      zoomBar.hidden = !on;
      if (on && !g.running) { g.running = true; requestAnimationFrame(frame); }
    };
    stage._gc = g;
    return g;
  };
  // A slightly tilted starting view: R = Rx(−0.35) · Ry(0.5).
  ND.start = function () {
    var ca = Math.cos(-0.35), sa = Math.sin(-0.35), cb = Math.cos(0.5), sb = Math.sin(0.5);
    return [[cb, 0, sb], [sa * sb, ca, -sa * cb], [-ca * sb, sa, ca * cb]];
  };

  ND.controls = {
    "one-dimension": [
      { key: "mu", label: "Mean", min: -2, max: 2, step: 0.05, value: 0, show: function (v) { return "μ = " + num(v); } },
      { key: "sd", label: "Std. deviation", min: 0.4, max: 2, step: 0.05, value: 1, show: function (v) { return "σ = " + num(v); } }
    ],
    "two-dimension": [
      { key: "s1", label: "σ₁", min: 0.3, max: 1.2, step: 0.05, value: 1, show: function (v) { return "σ₁ = " + num(v); } },
      { key: "s2", label: "σ₂", min: 0.3, max: 1.2, step: 0.05, value: 0.6, show: function (v) { return "σ₂ = " + num(v); } },
      { key: "rho", label: "Correlation", min: -0.9, max: 0.9, step: 0.05, value: 0.5, show: function (v) { return "ρ = " + num(v); } }
    ],
    "three-dimension": [
      { key: "npts", label: "Points", min: 1000, max: 12000, step: 500, value: 5000, show: function (v) { return String(v); } },
      { key: "spin", label: "Rotation", type: "choice", value: "on", options: [["on", "Rotating"], ["off", "Paused"]] }
    ],
    "n-dimension": [{ key: "nd", label: "Dimension", min: 1, max: 100, step: 1, value: 3, show: function (v) { return "n = " + v; } }],
    quantum: [{ key: "om", label: "Trap frequency", min: 0.5, max: 2, step: 0.05, value: 1, show: function (v) { return "ω = " + num(v); } }]
  };
  ND.wide = { "two-dimension": 1, "three-dimension": 1 };

  specs.normal = {
    // Card cover: a static view of the cloud.
    cover: function (p) {
      var s = { npts: 3000 };
      var sc = scale([-4.6, 4.6], [-3.003, 3.003], this.box), X = sc.x, Y = sc.y, pts = ND.cloud().slice(0, s.npts), gb = p.g(null, true);
      [[3, 5], [2, 7], [1, 12]].forEach(function (b) {
        var e = p.circle(gb, X(0), Y(0), b[0] * sc.sx, "cell");
        e.style.fill = "color-mix(in srgb, var(--focus) " + b[1] + "%, transparent)";
      });
      var g = p.g(null, true);
      var c = Math.cos(0.5), sn = Math.sin(0.5), ct = Math.cos(0.35), st = Math.sin(0.35);
      var order = pts.map(function (q) {
        var x = c * q.v[0] + sn * q.v[2], z = -sn * q.v[0] + c * q.v[2], y = ct * q.v[1] - st * z;
        return { x: x, y: y, r: q.r };
      }).sort(function (u, v) { return v.r - u.r; });
      order.forEach(function (q) {
        var e = p.circle(g, X(q.x), Y(q.y), q.r <= 1 ? 1.9 : 1.6, "pt");
        e.style.setProperty("--c", q.r <= 1 ? "var(--focus)" : q.r <= 2 ? "var(--ink)" : "var(--warm)");
        if (q.r > 1) e.style.fillOpacity = q.r <= 2 ? "0.35" : "0.6";
      });
      var gs = p.g(null), cnt = [0, 0, 0, 0];
      pts.forEach(function (q) { cnt[q.r <= 1 ? 0 : q.r <= 2 ? 1 : q.r <= 3 ? 2 : 3]++; });
      [1, 2, 3].forEach(function (k) {
        p.circle(gs, X(0), Y(0), k * sc.sx, "curve thin c-muted dash");
        p.label("th-" + k, "r = " + k + "\\sigma", X(0) + k * sc.sx * 0.72 + 4, Y(0) - k * sc.sx * 0.72 - 2, "ne");
      });
      p.label("th-f", "p(\\mathbf{x}) = (2\\pi)^{-3/2} e^{-\\lVert\\mathbf{x}\\rVert^2/2}", X(-4.45), Y(2.9), "se");
      var vol = function (r) { return 4 / 3 * Math.PI * r * r * r; }, N = pts.length;
      var dens = [cnt[0] / N / vol(1), cnt[1] / N / (vol(2) - vol(1)), cnt[2] / N / (vol(3) - vol(2))];
      return "points in the core <i>r</i> ≤ 1: " + num(100 * cnt[0] / N, 1) + "% (theory " + num(100 * ND.inside(3, 1), 1) + "%), shell 1–2: " + num(100 * cnt[1] / N, 1) + "%, shell 2–3: " + num(100 * cnt[2] / N, 1) + "%, beyond: " + num(100 * cnt[3] / N, 1) + "%" +
        " &nbsp;·&nbsp; points per unit volume: " + num(100 * dens[0], 2) + "%, " + num(100 * dens[1], 2) + "%, " + num(100 * dens[2], 3) + "%: the middle shell holds the most points, the core is the densest";
    },
    alt: "Figures for the normal distribution: the bell curve with its 68–95–99.7 bands, correlated samples with elliptical contours in the plane, a 3-D cloud of samples that is dense in the middle and sparse toward the outside, the radius distribution in n dimensions, and the ground state of the quantum harmonic oscillator.",
    story: true,
    controls: function (s) { return ND.controls[s.ch] || []; },
    init: function (s, thumb) {
      s.ch = thumb ? "three-dimension" : "one-dimension";
      for (var c in ND.controls) ND.controls[c].forEach(function (o) { s[o.key] = o.value; });
      this.box = thumb ? { l: 12, r: 12, t: 12, b: 12 } : BOX;
    },
    select: function (s, slug) {
      if (!slug || slug === s.ch || !ND.controls[slug]) return false;
      s.ch = slug;
      this.box = ND.wide[slug] ? { l: 12, r: 12, t: 12, b: 12 } : BOX;
      return true;
    },
    render: function (s, p) {
      if (s.ch !== "three-dimension" && p.svg.parentNode._gc) p.svg.parentNode._gc.show(false);
      return this[s.ch](s, p);
    },
    click: function (s) {
      if (s.ch !== "three-dimension") return false;
      s.reseed = (s.reseed || 0) + 1;
      return true;
    },
    describe: byBlock({
      "one-dimension": "Blue: the normal density φ(<i>x</i>) with mean μ and standard deviation σ. The shaded bands are μ ± σ, μ ± 2σ and μ ± 3σ, darker for the inner ones, with the share of probability each contains.",
      "two-dimension": "Gray dots: 1200 samples from a 2-D normal with covariance Σ. Blue ellipses: the level sets where the density has dropped by e<sup>−1/2</sup>, e<sup>−2</sup> and e<sup>−9/2</sup> (Mahalanobis radius 1, 2, 3). Brown arrows: the principal axes, the eigenvectors of Σ scaled by √λ.",
      "three-dimension": "A spinning cloud of samples from the 3-D standard normal, |ψ|² ∝ e<sup>−<i>r</i>²/2</sup> with σ = 1. Blue points lie within 1σ of the center, black within 2σ, brown beyond; nearer points are drawn larger and brighter. The dashed circles are the spheres of radius 1, 2 and 3σ. The core is dense; the outer shells hold many points but spread them over much more volume.",
      "n-dimension": "Blue: the density of the distance <i>r</i> = ‖<i>X</i>‖ from the center for <i>X</i> ~ N(0, <i>I<sub>n</sub></i>), the chi distribution. Dashed gray: the density per unit volume at distance <i>r</i>, which is always largest at the center. Their product with the sphere's area gives the blue curve.",
      quantum: "Black: the potential <i>V</i>(<i>x</i>) = ½<i>m</i>ω²<i>x</i>² of a harmonic trap. Gray lines: the energy levels <i>E<sub>n</sub></i> = (<i>n</i> + ½)ħω, with the wavefunctions ψ<sub><i>n</i></sub> drawn on them. Blue: the ground-state probability density |ψ<sub>0</sub>|², a normal distribution (units ħ = <i>m</i> = 1)."
    }),

    "one-dimension": function (s, p) {
      var m = s.mu, sd = s.sd, sc = scale([-5.2, 5.4], [0, 1.15]), X = sc.x, Y = sc.y, i, g = p.g(null, true);
      [[3, 12], [2, 22], [1, 34]].forEach(function (b) {
        var pts = [[X(m - b[0] * sd), Y(0)]];
        for (i = 0; i <= 120; i++) { var x = m - b[0] * sd + 2 * b[0] * sd * i / 120; pts.push([X(x), Y(ND.phi(x, m, sd))]); }
        pts.push([X(m + b[0] * sd), Y(0)]);
        var e = p.poly(g, pts, "cell", true);
        e.style.fill = "color-mix(in srgb, var(--focus) " + b[1] + "%, transparent)";
      });
      var c = [];
      for (i = 0; i <= 300; i++) { var x2 = -5.2 + 10.6 * i / 300; c.push([X(x2), Y(ND.phi(x2, m, sd))]); }
      p.poly(g, c, "curve c-accent");
      p.axes(sc, { xticks: [-4, -2, 0, 2, 4], xlabel: "x" });
      p.label("od-f", "\\varphi(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}\\, e^{-(x-\\mu)^2 / 2\\sigma^2}", X(m + 1.3 * sd), Y(ND.phi(m + 1.3 * sd, m, sd)) - 4, "ne");
      p.label("od-1", "\\mu \\pm \\sigma: 68.3\\%", X(-5), Y(1.05), "se");
      p.label("od-2", "\\mu \\pm 2\\sigma: 95.4\\%", X(-5), Y(0.93), "se");
      p.label("od-3", "\\mu \\pm 3\\sigma: 99.7\\%", X(-5), Y(0.81), "se");
      return "peak height 1/(σ√(2π)) = " + num(ND.phi(m, m, sd), 3) + " at <i>x</i> = μ = " + num(m) + " &nbsp;·&nbsp; inflection points at μ ± σ = " + num(m - sd) + ", " + num(m + sd) + " &nbsp;·&nbsp; total area 1";
    },

    "two-dimension": function (s, p) {
      var sc = this.sc = scale([-3.3, 3.3], [-2.155, 2.155], this.box), X = sc.x, Y = sc.y, a = s.s1, b = s.s2, r = s.rho, i;
      var S = [[a * a, r * a * b], [r * a * b, b * b]], tr = S[0][0] + S[1][1], det = S[0][0] * S[1][1] - S[0][1] * S[0][1];
      var l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det);
      var e1 = Math.abs(S[0][1]) > 1e-12 ? [l1 - S[1][1], S[0][1]] : (S[0][0] >= S[1][1] ? [1, 0] : [0, 1]), n1 = Math.sqrt(e1[0] * e1[0] + e1[1] * e1[1]);
      e1 = [e1[0] / n1, e1[1] / n1];
      var e2 = [-e1[1], e1[0]], g0 = p.g(null);
      p.line(g0, X(-3.3), Y(0), X(3.3), Y(0), "axisline");
      p.line(g0, X(0), Y(-2.155), X(0), Y(2.155), "axisline");
      var gp = p.g(null, true), c = Math.sqrt(1 - r * r);
      ND.flat().forEach(function (z) {
        var x = a * z[0], y = b * (r * z[0] + c * z[1]);
        var e = p.circle(gp, X(x), Y(y), 1.6, "pt");
        e.style.setProperty("--c", "var(--muted)");
      });
      [1, 2, 3].forEach(function (k) {
        var pts = [];
        for (i = 0; i <= 120; i++) {
          var t = i / 120 * 2 * Math.PI, u = k * Math.sqrt(l1) * Math.cos(t), v = k * Math.sqrt(l2) * Math.sin(t);
          pts.push([X(u * e1[0] + v * e2[0]), Y(u * e1[1] + v * e2[1])]);
        }
        p.poly(gp, pts, "curve " + (k === 1 ? "" : "thin ") + "c-accent", true);
      });
      var ga = p.g(null);
      p.arrow(ga, X(0), Y(0), X(Math.sqrt(l1) * e1[0]), Y(Math.sqrt(l1) * e1[1]), "c-warm");
      p.arrow(ga, X(0), Y(0), X(Math.sqrt(l2) * e2[0]), Y(Math.sqrt(l2) * e2[1]), "c-warm");
      p.label("td-f", "p(\\mathbf{x}) = \\frac{1}{2\\pi\\sqrt{\\det\\Sigma}}\\, e^{-\\frac12 \\mathbf{x}^\\top \\Sigma^{-1} \\mathbf{x}}", X(-3.15), Y(2.05), "se");
      p.label("td-e", "\\mathbf{x}^\\top\\Sigma^{-1}\\mathbf{x} = 1, 4, 9", X(3.15), Y(-2.05), "nw");
      return "Σ = [[" + num(S[0][0]) + ", " + num(S[0][1]) + "], [" + num(S[1][0]) + ", " + num(S[1][1]) + "]] &nbsp;·&nbsp; eigenvalues " + num(l1, 3) + ", " + num(l2, 3) +
        " &nbsp;·&nbsp; the ellipses hold " + num(100 * ND.inside(2, 1), 1) + "%, " + num(100 * ND.inside(2, 2), 1) + "% and " + num(100 * ND.inside(2, 3), 1) + "% of the probability";
    },

    "three-dimension": function (s, p) {
      var w = ND.widget(p.svg.parentNode);
      if (!s.cloud || s.cloud.n !== s.npts || s.cloud.seed !== s.reseed) {
        s.cloud = ND.sample(s.npts);
        s.cloud.n = s.npts; s.cloud.seed = s.reseed;
      }
      w.pts = s.cloud.pts;
      w.spin = s.spin === "on";
      w.show(true);
      p.label("th-f", "p(\\mathbf{x}) = (2\\pi)^{-3/2} e^{-\\lVert\\mathbf{x}\\rVert^2/2}", 14, 14, "se");
      var I = s.cloud.inside, vol = function (r) { return 4 / 3 * Math.PI * r * r * r; };
      var dens = [I[0] / vol(1), (I[1] - I[0]) / (vol(2) - vol(1)), (I[2] - I[1]) / (vol(3) - vol(2))];
      return "inside <i>r</i> &lt; 1σ: <b>" + num(100 * I[0], 1) + "%</b> (theory " + num(100 * ND.inside(3, 1), 1) + "%) &nbsp;·&nbsp; inside 2σ: <b>" + num(100 * I[1], 1) + "%</b> (" + num(100 * ND.inside(3, 2), 1) +
        "%) &nbsp;·&nbsp; inside 3σ: <b>" + num(100 * I[2], 1) + "%</b> (" + num(100 * ND.inside(3, 3), 1) + "%)<br>points per unit volume in the core, shell 1–2 and shell 2–3: " +
        num(100 * dens[0], 2) + "%, " + num(100 * dens[1], 2) + "%, " + num(100 * dens[2], 3) + "%: the middle shell holds the most points, the core is the densest. <span class=\"muted\">Drag to spin it your way; scroll, pinch or use + / − to zoom; tap to resample.</span>";
    },

    "n-dimension": function (s, p) {
      var n = s.nd, lc = (1 - n / 2) * Math.log(2) - HD.lgamma(n / 2), i, cv = [], dv = [], top = 0;
      var f = function (r) { return r <= 0 ? (n === 1 ? Math.exp(lc) : 0) : Math.exp(lc + (n - 1) * Math.log(r) - r * r / 2); };
      var xmax = Math.max(4.5, Math.sqrt(n) + 4);
      for (i = 0; i <= 400; i++) { var r = xmax * i / 400; top = Math.max(top, f(r)); }
      var sc = scale([-xmax * 0.04, xmax * 1.03], [0, top * 1.25]), X = sc.x, Y = sc.y, g = p.g(null, true);
      for (i = 0; i <= 400; i++) {
        var r2 = xmax * i / 400;
        cv.push([X(r2), Y(f(r2))]);
        dv.push([X(r2), Y(top * Math.exp(-r2 * r2 / 2))]);
      }
      p.poly(g, [[X(0), Y(0)]].concat(cv, [[X(xmax), Y(0)]]), "fill c-accent", true);
      p.poly(g, dv, "curve thin c-muted dash");
      p.poly(g, cv, "curve c-accent");
      var mode = Math.sqrt(Math.max(n - 1, 0));
      p.line(g, X(mode), Y(0), X(mode), Y(f(mode)), "curve thin c-warm");
      p.axes(sc, { xlabel: "r = \\lVert X \\rVert" });
      p.label("nd-f", "p_n(r) = \\frac{r^{n-1} e^{-r^2/2}}{2^{n/2-1}\\Gamma(n/2)}", X(mode + 1.1), Y(f(mode + 1.1)), "e");
      p.label("nd-d", "e^{-r^2/2} \\ (\\text{density per volume, scaled})", X(0.35), Y(top * 1.17), "se");
      p.label("nd-m", "\\sqrt{n-1}", X(mode), Y(0) + 6, "s");
      return "most likely distance √(<i>n</i> − 1) = " + num(mode, 2) + " &nbsp;·&nbsp; inside radius 1: " + sci(Math.max(ND.inside(n, 1), 1e-300)) + " &nbsp;·&nbsp; inside radius √<i>n</i> ± 1: " +
        num(100 * (ND.inside(n, Math.sqrt(n) + 1) - ND.inside(n, Math.max(Math.sqrt(n) - 1, 0))), 1) + "% &nbsp;·&nbsp; in high dimensions the samples live on a thin shell, while the center stays the densest point";
    },

    quantum: function (s, p) {
      var w = s.om, sc = scale([-4.6, 4.6], [0, 4.6 * w]), X = sc.x, Y = sc.y, i, n, g = p.g(null, true);
      var V = []; for (i = 0; i <= 200; i++) { var x = -4.6 + 9.2 * i / 200; V.push([X(x), Y(Math.min(0.5 * w * w * x * x, 4.7 * w))]); }
      p.axes(sc, { xticks: [-4, -2, 2, 4], xlabel: "x" });
      var k = 0.42 * w / Math.pow(w / Math.PI, 0.25);
      for (n = 3; n >= 0; n--) {
        var E = (n + 0.5) * w, tp = Math.sqrt(2 * E) / w;
        p.line(g, X(-tp), Y(E), X(tp), Y(E), "curve thin c-muted");
        var ps = [];
        for (i = 0; i <= 240; i++) { var x2 = -4.6 + 9.2 * i / 240; ps.push([X(x2), Y(E + k * ND.psi(n, x2, w))]); }
        if (n === 0) {
          var d = [];
          for (i = 0; i <= 240; i++) { var x3 = -4.6 + 9.2 * i / 240, q = ND.psi(0, x3, w); d.push([X(x3), Y(E + 1.2 * k * q * q / Math.pow(w / Math.PI, 0.25))]); }
          p.poly(g, [[X(-4.6), Y(E)]].concat(d, [[X(4.6), Y(E)]]), "fill c-accent", true);
          p.poly(g, d, "curve c-accent");
        } else p.poly(g, ps, "curve thin");
        p.label("qm-E" + n, "E_" + n + " = \\tfrac{" + (2 * n + 1) + "}{2}\\hbar\\omega", X(4.5), Y(E), "w");
      }
      p.poly(g, V, "curve");
      p.label("qm-V", "V(x) = \\tfrac12 m\\omega^2 x^2", X(-3.9), Y(Math.min(0.5 * w * w * 3.9 * 3.9, 4.3 * w)), "e");
      p.label("qm-p", "\\lvert\\psi_0\\rvert^2 = \\mathcal{N}\\!\\left(0, \\tfrac{\\hbar}{2m\\omega}\\right)", X(0) + 18, Y(0.5 * w + 1.2 * k * Math.sqrt(w / Math.PI) / Math.pow(w / Math.PI, 0.25)) - 2, "ne");
      var sx = Math.sqrt(1 / (2 * w)), sp = Math.sqrt(w / 2);
      return "ground state: σ<sub><i>x</i></sub> = √(ħ/2<i>m</i>ω) = " + num(sx, 3) + ", σ<sub><i>p</i></sub> = √(<i>m</i>ħω/2) = " + num(sp, 3) + ", product " + num(sx * sp, 3) +
        " = ħ/2: the minimum Heisenberg allows &nbsp;·&nbsp; a stiffer trap (larger ω) squeezes the Gaussian in <i>x</i> and widens it in <i>p</i>";
    }
  };

  // From Brownian motion to Black–Scholes. Every figure simulates the
  // statement it illustrates; tap a path figure for new randomness.
  var BS = { S0: 100, K: 100, T: 1 };
  BS.Phi = function (x) {
    var t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2), y = Math.exp(-x * x / 2);
    var e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * y;
    return x >= 0 ? 0.5 * (1 + e) : 0.5 * (1 - e);
  };
  BS.d1 = function (S, K, r, s, tau) { return (Math.log(S / K) + (r + s * s / 2) * tau) / (s * Math.sqrt(tau)); };
  BS.call = function (S, K, r, s, tau) {
    if (tau <= 1e-12) return Math.max(S - K, 0);
    var d1 = BS.d1(S, K, r, s, tau);
    return S * BS.Phi(d1) - K * Math.exp(-r * tau) * BS.Phi(d1 - s * Math.sqrt(tau));
  };
  // Brownian path on [0, T] with n steps: W[0..n].
  BS.path = function (seed, n, T) {
    var rnd = HD.rng(seed), W = [0], h = Math.sqrt(T / n);
    for (var i = 0; i < n; i++) W.push(W[i] + h * rnd());
    return W;
  };
  BS.fine = 4096;
  BS.base = function (s) { return BS.path(1000 + (s.bseed || 0), BS.fine, 1); };
  // Sample a fine path at n equal steps.
  BS.coarse = function (W, n) { var m = BS.fine / n, out = []; for (var i = 0; i <= n; i++) out.push(W[i * m]); return out; };
  BS.line = function (p, g, sc, ts, ys, cls) { p.poly(g, ts.map(function (t, i) { return [sc.x(t), sc.y(ys[i])]; }), cls); };
  BS.grid = function (n, T) { var t = []; for (var i = 0; i <= n; i++) t.push(T * i / n); return t; };
  // Delta hedging of the at-the-money call along one real-world GBM path.
  BS.hedge = function (seed, n, keep) {
    var r = 0.03, s = 0.2, mu = 0.08, T = BS.T, dt = T / n, rnd = HD.rng(seed), S = BS.S0;
    var X = BS.call(S, BS.K, r, s, T), Ss = [S], Xs = [X], Vs = [X];
    for (var i = 0; i < n; i++) {
      var tau = T - i * dt, D = BS.Phi(BS.d1(S, BS.K, r, s, tau)), cash = X - D * S;
      S = S * Math.exp((mu - s * s / 2) * dt + s * Math.sqrt(dt) * rnd());
      X = D * S + cash * Math.exp(r * dt);
      if (keep) { Ss.push(S); Xs.push(X); Vs.push(BS.call(S, BS.K, r, s, tau - dt)); }
    }
    return { S: Ss, X: Xs, V: Vs, err: X - Math.max(S - BS.K, 0), ST: S };
  };

  function pw(key, label, lo, hi, v) { return { key: key, label: label, min: lo, max: hi, step: 1, value: v, show: function (k) { return "n = " + Math.pow(2, k); } }; }
  BS.controls = {
    "random-walk": [pw("rwk", "Steps per unit time", 1, 10, 4)],
    "brownian-motion": [{ key: "tb", label: "Time", min: 0.05, max: 1, step: 0.01, value: 0.6, show: function (v) { return "t = " + num(v); } }],
    "quadratic-variation": [pw("qk", "Partition", 2, 12, 5)],
    "ito-integral": [pw("ik", "Partition", 2, 11, 6)],
    "ito-lemma": [pw("lk", "Partition", 2, 11, 6)],
    gbm: [
      { key: "gmu", label: "Drift", min: -0.2, max: 0.4, step: 0.01, value: 0.1, show: function (v) { return "μ = " + num(v); } },
      { key: "gsig", label: "Volatility", min: 0.05, max: 0.8, step: 0.01, value: 0.3, show: function (v) { return "σ = " + num(v); } }
    ],
    "black-scholes-pde": [{ key: "hk", label: "Rebalances", min: 2, max: 10, step: 1, value: 5, show: function (k) { return Math.pow(2, k) + " trades"; } }],
    "black-scholes-formula": [
      { key: "fsig", label: "Volatility", min: 0.05, max: 0.8, step: 0.01, value: 0.2, show: function (v) { return "σ = " + num(v); } },
      { key: "fr", label: "Interest rate", min: 0, max: 0.1, step: 0.005, value: 0.03, show: function (v) { return "r = " + num(v, 3); } }
    ],
    "risk-neutral": [
      { key: "qsig", label: "Volatility", min: 0.05, max: 0.6, step: 0.01, value: 0.2, show: function (v) { return "σ = " + num(v); } },
      { key: "nmc", label: "Samples", min: 500, max: 20000, step: 500, value: 4000, show: function (v) { return String(v); } }
    ]
  };

  specs["black-scholes"] = {
    alt: "Figures from Brownian motion to Black–Scholes: random walks converging to Brownian motion, Brownian paths with their spread, quadratic variation, the Itô integral, Itô's lemma, geometric Brownian motion, delta hedging, the Black–Scholes price curves, and Monte Carlo risk-neutral pricing.",
    story: true,
    controls: function (s) { return BS.controls[s.ch] || []; },
    init: function (s, thumb) {
      s.ch = thumb ? "gbm" : "random-walk";
      for (var c in BS.controls) BS.controls[c].forEach(function (o) { s[o.key] = o.value; });
      s.bseed = 0;
      this.box = BOX;
    },
    select: function (s, slug) {
      if (!slug || slug === s.ch || !BS.controls[slug]) return false;
      s.ch = slug;
      return true;
    },
    render: function (s, p) { return this[s.ch](s, p) + (s.ch === "black-scholes-formula" ? "" : " <span class=\"muted\">Tap the figure for new random paths.</span>"); },
    click: function (s) {
      if (s.ch === "black-scholes-formula") return false;
      s.bseed++;
      return true;
    },
    describe: byBlock({
      "random-walk": "Five scaled random walks: each takes <i>n</i> steps of ±1 per unit time and is divided by √<i>n</i>. Dashed: ±√<i>t</i> and ±2√<i>t</i>. As <i>n</i> grows the jagged walks become Brownian paths.",
      "brownian-motion": "Thirty Brownian paths on [0, 1]. Dashed: ±√<i>t</i> and ±2√<i>t</i>. At the chosen time <i>t</i>, the sideways blue curve is the density of <i>W<sub>t</sub></i> ~ N(0, <i>t</i>), and the dots are where the paths are.",
      "quadratic-variation": "Gray: one Brownian path <i>W<sub>t</sub></i>. Blue: its quadratic variation along a partition with <i>n</i> steps, the running sum of squared increments. Dashed: the line <i>y</i> = <i>t</i> it converges to.",
      "ito-integral": "Along one Brownian path: blue, the left-point sums Σ <i>W</i>(<i>t<sub>i</sub></i>)Δ<i>W</i> that define the Itô integral ∫<i>W</i> d<i>W</i>; dashed black, ½<i>W<sub>t</sub></i>² − ½<i>t</i>; brown, the midpoint (Stratonovich) sums, equal to ½<i>W<sub>t</sub></i>².",
      "ito-lemma": "Along one Brownian path: black, <i>e</i><sup><i>W<sub>t</sub></i></sup>; blue dashed, Itô's lemma 1 + ∫<i>e<sup>W</sup></i> d<i>W</i> + ½∫<i>e<sup>W</sup></i> d<i>t</i> summed on the partition; brown, the ordinary chain rule 1 + ∫<i>e<sup>W</sup></i> d<i>W</i>, which misses the ½<i>f</i>″ term.",
      gbm: "Twenty paths of geometric Brownian motion from <i>S</i><sub>0</sub> = 100 over two years. Dashed black: the mean <i>S</i><sub>0</sub><i>e</i><sup>μ<i>t</i></sup>. Dashed blue: the median <i>S</i><sub>0</sub><i>e</i><sup>(μ − σ²/2)<i>t</i></sup>, which is lower.",
      "black-scholes-pde": "One stock path (gray, right scale) and the at-the-money call written on it. Black: the Black–Scholes value <i>V</i>(<i>t</i>, <i>S<sub>t</sub></i>). Blue: a self-financing portfolio holding Δ = ∂<i>V</i>/∂<i>S</i> shares, rebalanced at the chosen number of dates. The two end at the payoff (<i>S<sub>T</sub></i> − <i>K</i>)⁺ up to a hedging error.",
      "black-scholes-formula": "Black–Scholes call prices against the stock price <i>S</i> for strike <i>K</i> = 100 and times to maturity τ = 1, 0.5 and 0.1 years (blue, darker for longer). Black: the payoff (<i>S</i> − <i>K</i>)⁺ at τ = 0.",
      "risk-neutral": "Histogram of simulated <i>S<sub>T</sub></i> under the risk-neutral measure (drift <i>r</i>), with the lognormal density in blue. Brown: the call payoff (<i>S<sub>T</sub></i> − <i>K</i>)⁺. Its discounted average is the Monte Carlo price."
    }),

    "random-walk": function (s, p) {
      var n = Math.pow(2, s.rwk), sc = scale([-0.04, 1.08], [-2.9, 2.9]), X = sc.x, Y = sc.y, g = p.g(null, true), k, i;
      var env = [];
      for (i = 0; i <= 100; i++) env.push(i / 100);
      [[1, "curve thin c-muted dash"], [2, "curve thin c-muted dash"]].forEach(function (e) {
        BS.line(p, g, sc, env, env.map(function (t) { return e[0] * Math.sqrt(t); }), e[1]);
        BS.line(p, g, sc, env, env.map(function (t) { return -e[0] * Math.sqrt(t); }), e[1]);
      });
      var cls = ["c-accent", "c-warm", "", "c-accent", "c-warm"], ends = [];
      for (k = 0; k < 5; k++) {
        var u = RL.uniform(7919 * (k + 1) + 31 * (s.bseed || 0)), S = 0, pts = [[X(0), Y(0)]];
        for (i = 1; i <= n; i++) {
          var step = u() < 0.5 ? -1 : 1;
          pts.push([X((i - 1) / n + 1 / n), Y(S / Math.sqrt(n))]);
          S += step;
          pts.push([X(i / n), Y(S / Math.sqrt(n))]);
          if (n > 64) pts.pop(), pts.pop(), pts.push([X(i / n), Y(S / Math.sqrt(n))]);
        }
        p.poly(g, pts, "curve thin " + cls[k]);
        ends.push(S / Math.sqrt(n));
      }
      p.axes(sc, { xticks: [0.5, 1], yticks: [-2, -1, 1, 2], xlabel: "t" });
      p.label("rw-f", "W^{(n)}_t = \\frac{1}{\\sqrt n}\\, S_{\\lfloor nt \\rfloor}, \\quad S_k = \\xi_1 + \\cdots + \\xi_k", X(0.02), Y(2.8), "se");
      p.label("rw-e", "\\pm 2\\sqrt t", X(1), Y(2), "e");
      return "<i>n</i> = " + n + " steps of size 1/√<i>n</i> = " + num(1 / Math.sqrt(n), 3) + " &nbsp;·&nbsp; Var <i>W</i><sup>(<i>n</i>)</sup><sub>1</sub> = 1 for every <i>n</i> &nbsp;·&nbsp; end values: " + ends.map(function (v) { return num(v, 2); }).join(", ");
    },

    "brownian-motion": function (s, p) {
      var t0 = s.tb, n = 256, ts = BS.grid(n, 1), sc = scale([-0.04, 1.32], [-2.9, 2.9]), X = sc.x, Y = sc.y, g = p.g(null, true), k, i, ends = [];
      for (k = 0; k < 30; k++) {
        var W = BS.path(500 + 37 * k + 1000 * (s.bseed || 0), n, 1);
        BS.line(p, g, sc, ts, W, "curve thin c-muted");
        ends.push(W[Math.round(t0 * n)]);
      }
      [1, 2].forEach(function (m) {
        BS.line(p, g, sc, ts, ts.map(function (t) { return m * Math.sqrt(t); }), "curve thin dash");
        BS.line(p, g, sc, ts, ts.map(function (t) { return -m * Math.sqrt(t); }), "curve thin dash");
      });
      p.line(g, X(t0), Y(-2.9), X(t0), Y(2.9), "curve thin c-accent dash");
      var dens = [], sd = Math.sqrt(t0);
      for (i = 0; i <= 120; i++) { var y = -2.9 + 5.8 * i / 120; dens.push([X(t0) + 0.28 * sc.sx * ND.phi(y, 0, sd) / ND.phi(0, 0, sd), Y(y)]); }
      p.poly(g, dens, "curve c-accent");
      ends.forEach(function (v) { p.circle(g, X(t0), Y(v), 3, "dot c-accent"); });
      p.axes(sc, { xticks: [0.5, 1], yticks: [-2, -1, 1, 2], xlabel: "t" });
      p.label("bm-d", "W_t \\sim \\mathcal{N}(0, t)", X(t0) + 0.3 * sc.sx, Y(0), "e");
      p.label("bm-e", "\\pm 2\\sqrt t", X(1), Y(-2), "e");
      var m = 0, v = 0; ends.forEach(function (e) { m += e / 30; }); ends.forEach(function (e) { v += (e - m) * (e - m) / 29; });
      return "<i>t</i> = " + num(t0) + ": the 30 paths have sample mean " + num(m, 3) + " and sample variance " + num(v, 3) + " (theory 0 and " + num(t0, 2) + ")";
    },

    "quadratic-variation": function (s, p) {
      var n = Math.pow(2, s.qk), W = BS.base(s), Wc = BS.coarse(W, n), ts = BS.grid(n, 1), q = [0], tv = 0, i;
      for (i = 0; i < n; i++) { var d = Wc[i + 1] - Wc[i]; q.push(q[i] + d * d); tv += Math.abs(d); }
      var lo = Math.min(-0.5, Math.min.apply(null, W)), hi = Math.max(1.6, Math.max.apply(null, W), q[n] + 0.2);
      var sc = scale([-0.04, 1.08], [lo - 0.2, hi + 0.25]), g = p.g(null, true);
      BS.line(p, g, sc, BS.grid(BS.fine, 1).filter(function (t, k) { return k % 4 === 0; }), W.filter(function (w, k) { return k % 4 === 0; }), "curve thin c-muted");
      BS.line(p, g, sc, [0, 1], [0, 1], "curve thin dash");
      BS.line(p, g, sc, ts, q, "curve c-accent");
      p.axes(sc, { xticks: [0.5, 1], yticks: [1], xlabel: "t" });
      p.label("qv-f", "\\textstyle\\sum_{t_i \\le t} (W_{t_{i+1}} - W_{t_i})^2", sc.x(0.6), sc.y(q[Math.round(0.6 * n)]) - 6, "se");
      p.label("qv-t", "y = t", sc.x(0.95), sc.y(0.95), "nw");
      p.label("qv-w", "W_t", sc.x(0.02), sc.y(W[80]), "se");
      return "partition of [0, 1] into <i>n</i> = " + n + " steps &nbsp;·&nbsp; quadratic variation Σ(Δ<i>W</i>)² = " + num(q[n], 4) + " → 1 &nbsp;·&nbsp; total variation Σ|Δ<i>W</i>| = " + num(tv, 2) + " (about √(2<i>n</i>/π) = " + num(Math.sqrt(2 * n / Math.PI), 2) + ", unbounded)";
    },

    "ito-integral": function (s, p) {
      var n = Math.pow(2, s.ik), W = BS.coarse(BS.base(s), n), ts = BS.grid(n, 1), L = [0], M = [0], E = [], i;
      for (i = 0; i < n; i++) { var d = W[i + 1] - W[i]; L.push(L[i] + W[i] * d); M.push(M[i] + 0.5 * (W[i] + W[i + 1]) * d); }
      ts.forEach(function (t, k) { E.push(0.5 * W[k] * W[k] - 0.5 * t); });
      var all = L.concat(M, E), sc = scale([-0.04, 1.08], [Math.min.apply(null, all) - 0.3, Math.max.apply(null, all) + 0.5]), g = p.g(null, true);
      BS.line(p, g, sc, ts, M, "curve c-warm");
      BS.line(p, g, sc, ts, E, "curve thin dash");
      BS.line(p, g, sc, ts, L, "curve c-accent");
      p.axes(sc, { xticks: [0.5, 1], xlabel: "t" });
      p.label("ii-l", "\\text{blue: } \\textstyle\\sum W_{t_i}\\,\\Delta W \\to \\int_0^t W\\,dW", sc.x(0.02), sc.y(sc.yd[1]) + 4, "se");
      p.label("ii-e", "\\text{dashed: } \\tfrac12 W_t^2 - \\tfrac12 t", sc.x(0.02), sc.y(sc.yd[1]) + 30, "se");
      p.label("ii-m", "\\text{brown: } \\textstyle\\sum \\tfrac{W_{t_i} + W_{t_{i+1}}}{2}\\Delta W = \\tfrac12 W_t^2", sc.x(0.02), sc.y(sc.yd[1]) + 56, "se");
      return "<i>n</i> = " + n + ": left sum at <i>t</i> = 1 is " + num(L[n], 4) + ", ½<i>W</i><sub>1</sub>² − ½ = " + num(E[n], 4) + " (gap " + num(L[n] - E[n], 4) + ", which is ½(1 − Σ(Δ<i>W</i>)²)) &nbsp;·&nbsp; midpoint sum " + num(M[n], 4) + " = ½<i>W</i><sub>1</sub>²";
    },

    "ito-lemma": function (s, p) {
      var n = Math.pow(2, s.lk), W = BS.coarse(BS.base(s), n), ts = BS.grid(n, 1), dt = 1 / n, F = W.map(Math.exp), I = [1], N = [1], i;
      for (i = 0; i < n; i++) { var d = W[i + 1] - W[i]; I.push(I[i] + F[i] * d + 0.5 * F[i] * dt); N.push(N[i] + F[i] * d); }
      var all = F.concat(I, N), sc = scale([-0.04, 1.08], [Math.min(0, Math.min.apply(null, all)) - 0.1, Math.max.apply(null, all) * 1.15 + 0.2]), g = p.g(null, true);
      BS.line(p, g, sc, ts, N, "curve c-warm");
      BS.line(p, g, sc, ts, F, "curve");
      BS.line(p, g, sc, ts, I, "curve c-accent dash");
      p.axes(sc, { xticks: [0.5, 1], yticks: [1], xlabel: "t" });
      p.label("il-f", "\\text{black: } e^{W_t}", sc.x(0.02), sc.y(sc.yd[1]) + 4, "se");
      p.label("il-i", "\\text{blue: } 1 + \\int_0^t e^{W} dW + \\tfrac12 \\int_0^t e^{W} ds", sc.x(0.02), sc.y(sc.yd[1]) + 30, "se");
      p.label("il-n", "\\text{brown: } 1 + \\int_0^t e^{W} dW \\ (\\text{no Itô term})", sc.x(0.02), sc.y(sc.yd[1]) + 56, "se");
      return "<i>n</i> = " + n + " at <i>t</i> = 1: <i>e</i><sup><i>W</i><sub>1</sub></sup> = " + num(F[n], 4) + ", Itô sum " + num(I[n], 4) + " (error " + num(I[n] - F[n], 4) + "), chain-rule sum " + num(N[n], 4) + " (error " + num(N[n] - F[n], 4) + ")";
    },

    gbm: function (s, p) {
      var mu = s.gmu, sg = s.gsig, T = 2, n = 200, ts = BS.grid(n, T), k, paths = [], top = 0;
      for (k = 0; k < 20; k++) {
        var W = BS.path(900 + 53 * k + 1000 * (s.bseed || 0), n, T);
        var P = W.map(function (w, i) { return BS.S0 * Math.exp((mu - sg * sg / 2) * ts[i] + sg * w); });
        paths.push(P); top = Math.max(top, Math.max.apply(null, P));
      }
      top = Math.min(Math.max(top, BS.S0 * Math.exp(mu * T)) * 1.08, 600);
      var sc = scale([-0.08, 2.16], [0, top]), g = p.g(null, true);
      paths.forEach(function (P, i) { BS.line(p, g, sc, ts, P, "curve thin " + (i % 3 === 0 ? "c-accent" : i % 3 === 1 ? "c-muted" : "c-warm")); });
      BS.line(p, g, sc, ts, ts.map(function (t) { return BS.S0 * Math.exp(mu * t); }), "curve dash");
      BS.line(p, g, sc, ts, ts.map(function (t) { return BS.S0 * Math.exp((mu - sg * sg / 2) * t); }), "curve c-accent dash");
      p.axes(sc, { xticks: [1, 2], yticks: [100, 200, 300, 400, 500].filter(function (v) { return v < top; }), xlabel: "t" });
      p.label("gb-s", "S_t = S_0 \\exp\\!\\bigl((\\mu - \\tfrac12\\sigma^2)t + \\sigma W_t\\bigr)", sc.x(0.02), sc.y(top) + 4, "se");
      p.label("gb-m", "\\text{dashed black: } \\mathbb{E}S_t = S_0 e^{\\mu t}", sc.x(0.02), sc.y(top) + 32, "se");
      p.label("gb-d", "\\text{dashed blue: median } S_0 e^{(\\mu - \\sigma^2/2) t}", sc.x(0.02), sc.y(top) + 58, "se");
      var ends = paths.map(function (P) { return P[n]; }), below = ends.filter(function (v) { return v < BS.S0 * Math.exp(mu * T); }).length;
      return "at <i>t</i> = 2: mean " + num(BS.S0 * Math.exp(mu * T), 1) + ", median " + num(BS.S0 * Math.exp((mu - sg * sg / 2) * T), 1) + " &nbsp;·&nbsp; " + below + " of 20 paths end below the mean: a few large paths pull the mean up";
    },

    "black-scholes-pde": function (s, p) {
      var n = Math.pow(2, s.hk), seed = 4000 + (s.bseed || 0), H = BS.hedge(seed, n, true), ts = BS.grid(n, BS.T), k, rms = 0, M = 200;
      for (k = 0; k < M; k++) { var e = BS.hedge(9000 + k, n, false).err; rms += e * e / M; }
      rms = Math.sqrt(rms);
      var vmax = Math.max(Math.max.apply(null, H.X), Math.max.apply(null, H.V), 12) * 1.25;
      var sc = scale([-0.04, 1.1], [Math.min(0, Math.min.apply(null, H.X)) - 1, vmax]), g = p.g(null, true);
      var smin = Math.min.apply(null, H.S), smax = Math.max.apply(null, H.S), sy = function (v) { return sc.yd[0] + (v - smin + 2) / (smax - smin + 4) * (sc.yd[1] - sc.yd[0]) * 0.55; };
      BS.line(p, g, sc, ts, H.S.map(sy), "curve thin c-muted");
      BS.line(p, g, sc, ts, H.V, "curve");
      BS.line(p, g, sc, ts, H.X, "curve c-accent dash");
      p.circle(g, sc.x(1), sc.y(Math.max(H.ST - BS.K, 0)), 5, "hollow c-warm");
      p.axes(sc, { xticks: [0.5, 1], xlabel: "t" });
      p.label("pd-v", "\\text{black: } V(t, S_t)", sc.x(0.02), sc.y(vmax) + 4, "se");
      p.label("pd-x", "\\text{blue: } X_t, \\ dX = \\Delta\\, dS + r(X - \\Delta S)\\,dt, \\ \\Delta = \\partial_S V", sc.x(0.02), sc.y(vmax) + 30, "se");
      p.label("pd-s", "\\text{gray: } S_t \\ (" + Math.round(smin) + "\\text{–}" + Math.round(smax) + ")", sc.x(0.02), sc.y(vmax) + 56, "se");
      p.label("pd-p", "(S_T - K)^+", sc.x(1) - 8, sc.y(Math.max(H.ST - BS.K, 0)), "w");
      return "<i>S</i><sub>0</sub> = <i>K</i> = 100, σ = 0.2, <i>r</i> = 3%, real drift μ = 8%, <i>T</i> = 1 &nbsp;·&nbsp; this path: <i>S<sub>T</sub></i> = " + num(H.ST, 2) + ", payoff " + num(Math.max(H.ST - BS.K, 0), 3) + ", portfolio " + num(H.X[n], 3) +
        " (error " + num(H.err, 3) + ") &nbsp;·&nbsp; root-mean-square error over 200 paths: " + num(rms, 3) + ", about halving when the trades quadruple";
    },

    "black-scholes-formula": function (s, p) {
      var sg = s.fsig, r = s.fr, K = BS.K, sc = scale([46, 156], [0, 62]), X = sc.x, Y = sc.y, g = p.g(null, true), i;
      var Ss = []; for (i = 0; i <= 220; i++) Ss.push(50 + 100 * i / 220);
      BS.line(p, g, sc, Ss, Ss.map(function (S) { return Math.max(S - K, 0); }), "curve");
      [[1, ""], [0.5, "thin "], [0.1, "thin "]].forEach(function (c, j) {
        var e = p.poly(g, Ss.map(function (S) { return [X(S), Y(BS.call(S, K, r, sg, c[0]))]; }), "curve " + c[1] + "c-accent");
        e.style.strokeOpacity = String(1 - 0.28 * j);
      });
      p.axes(sc, { xticks: [60, 80, 100, 120, 140], yticks: [10, 20, 30, 40, 50], xlabel: "S", ylabel: "C" });
      p.label("bf-f", "C = S\\,\\Phi(d_1) - K e^{-r\\tau}\\Phi(d_2), \\quad d_{1,2} = \\frac{\\ln(S/K) + (r \\pm \\sigma^2/2)\\tau}{\\sigma\\sqrt\\tau}", X(48), Y(60), "se");
      p.label("bf-p", "(S - K)^+", X(150), Y(50), "nw");
      p.label("bf-1", "\\tau = 1", X(64), Y(BS.call(64, K, r, sg, 1)) - 4, "n");
      var c0 = BS.call(K, K, r, sg, 1), d1 = BS.d1(K, K, r, sg, 1), gamma = Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI) / (K * sg);
      return "at <i>S</i> = <i>K</i> = 100, τ = 1: price " + num(c0, 3) + ", delta Φ(<i>d</i><sub>1</sub>) = " + num(BS.Phi(d1), 3) + ", gamma " + num(gamma, 4) + " &nbsp;·&nbsp; put by put–call parity <i>C</i> − <i>P</i> = <i>S</i> − <i>Ke</i><sup>−<i>r</i>τ</sup>: " + num(c0 - K + K * Math.exp(-r), 3);
    },

    "risk-neutral": function (s, p) {
      var sg = s.qsig, r = 0.03, T = BS.T, K = BS.K, N = s.nmc, rnd = HD.rng(7000 + (s.bseed || 0)), i, sum = 0, sq = 0, B = 60, lo = 30, hi = 230, w = (hi - lo) / B, bins = [];
      for (i = 0; i < B; i++) bins.push(0);
      for (i = 0; i < N; i++) {
        var ST = BS.S0 * Math.exp((r - sg * sg / 2) * T + sg * Math.sqrt(T) * rnd()), pay = Math.max(ST - K, 0);
        sum += pay; sq += pay * pay;
        if (ST >= lo && ST < hi) bins[Math.floor((ST - lo) / w)]++;
      }
      var mean = sum / N, se = Math.sqrt((sq / N - mean * mean) / N), disc = Math.exp(-r * T), exact = BS.call(BS.S0, K, r, sg, T);
      var dens = function (x) { var m = Math.log(BS.S0) + (r - sg * sg / 2) * T, v = sg * Math.sqrt(T); return Math.exp(-Math.pow(Math.log(x) - m, 2) / (2 * v * v)) / (x * v * Math.sqrt(2 * Math.PI)); };
      var top = 0; bins.forEach(function (c) { top = Math.max(top, c / (N * w)); });
      for (i = 0; i <= 200; i++) top = Math.max(top, dens(lo + (hi - lo) * i / 200));
      var sc = scale([lo - 6, hi + 4], [0, top * 1.3]), X = sc.x, Y = sc.y, g = p.g(null, true);
      bins.forEach(function (c, k) { if (c) p.rect(g, X(lo + k * w), Y(c / (N * w)), w * sc.sx - 1, Y(0) - Y(c / (N * w)), "bar"); });
      var dc = []; for (i = 0; i <= 200; i++) { var x = lo + (hi - lo) * i / 200; dc.push([X(x), Y(dens(x))]); }
      p.poly(g, dc, "curve c-accent");
      var pf = []; for (i = 0; i <= 40; i++) { var x2 = K + (hi - K) * i / 40; pf.push([X(x2), Y((x2 - K) / (hi - K) * top * 1.15)]); }
      p.poly(g, [[X(lo), Y(0)], [X(K), Y(0)]].concat(pf), "curve c-warm");
      p.axes(sc, { xticks: [50, 100, 150, 200], xlabel: "S_T" });
      p.label("rn-d", "S_T = S_0 e^{(r - \\sigma^2/2)T + \\sigma W^{\\mathbb{Q}}_T}", X(lo), Y(top * 1.27), "se");
      p.label("rn-p", "(S_T - K)^+ \\ (\\text{not to scale})", X(hi - 10), Y(top * 1.1), "w");
      return "Monte Carlo <i>e</i><sup>−<i>rT</i></sup> · mean payoff = " + num(disc * mean, 3) + " ± " + num(1.96 * disc * se, 3) + " (95%) &nbsp;·&nbsp; Black–Scholes formula " + num(exact, 3) + " &nbsp;·&nbsp; the real drift μ appears nowhere";
    }
  };

  // Calculus of variations: the Euler–Lagrange equation and where it leads.
  var EL = { g: 9.81 };
  EL.eta = {
    s1: function (t) { return Math.sin(Math.PI * t); },
    s2: function (t) { return Math.sin(2 * Math.PI * t); },
    bump: function (t) { var u = (t - 0.35) / 0.25; return Math.abs(u) < 1 ? Math.pow(1 - u * u, 2) : 0; }
  };
  // Integrate a function of t on [0, T] (Simpson, n even).
  EL.simpson = function (f, a, b, n) {
    n = n || 400; var h = (b - a) / n, s = f(a) + f(b);
    for (var i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
    return s * h / 3;
  };
  EL.d = function (f, t) { var h = 1e-5; return (f(t + h) - f(t - h)) / (2 * h); };
  // J(x) = ∫₀¹ ½ẋ² + ½x² dt; minimizer with x(0)=0, x(1)=1 is sinh t / sinh 1.
  EL.J = function (x) { return EL.simpson(function (t) { var v = EL.d(x, t), y = x(t); return 0.5 * v * v + 0.5 * y * y; }, 0, 1); };
  EL.star = function (t) { return Math.sinh(t) / Math.sinh(1); };
  // A small framed inset for a graph y(α).
  EL.inset = function (p, box, xr, yr, f, cur, tex, key) {
    var g = p.g(null), X = function (v) { return box[0] + (v - xr[0]) / (xr[1] - xr[0]) * box[2]; }, Y = function (v) { return box[1] + box[3] - (v - yr[0]) / (yr[1] - yr[0]) * box[3]; };
    p.rect(g, box[0], box[1], box[2], box[3], "inset");
    p.line(g, X(0), box[1], X(0), box[1] + box[3], "tick");
    var pts = []; for (var i = 0; i <= 80; i++) { var a = xr[0] + (xr[1] - xr[0]) * i / 80; pts.push([X(a), Math.min(Math.max(Y(f(a)), box[1]), box[1] + box[3])]); }
    p.poly(g, pts, "curve thin c-accent");
    p.circle(g, X(cur), Y(f(cur)), 4.5, "dot c-warm");
    p.label(key, tex, box[0] + 6, box[1] + 4, "se");
    p.text(g, X(0), box[1] + box[3] + 15, "0");
    p.text(g, box[0] + box[2] - 4, box[1] + box[3] + 15, "α", "end");
  };
  // Brachistochrone: a table of (x, y, time) along a curve from A = (0, 0), y downward.
  EL.race = function (pts) {
    var T = [0];
    for (var i = 1; i < pts.length; i++) {
      var ds = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), ym = (pts[i][1] + pts[i - 1][1]) / 2;
      T.push(T[i - 1] + ds / Math.sqrt(2 * EL.g * Math.max(ym, 1e-9)));
    }
    return T;
  };
  EL.at = function (pts, T, t) {
    if (t >= T[T.length - 1]) return pts[pts.length - 1];
    var lo = 0, hi = T.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
    var f = (t - T[lo]) / (T[hi] - T[lo]);
    return [pts[lo][0] + f * (pts[hi][0] - pts[lo][0]), pts[lo][1] + f * (pts[hi][1] - pts[lo][1])];
  };
  EL.cycloid = function (b, h) {
    var lo = 1e-6, hi = 2 * Math.PI - 1e-6, k = b / h;
    for (var i = 0; i < 80; i++) { var m = (lo + hi) / 2; if ((m - Math.sin(m)) / (1 - Math.cos(m)) < k) lo = m; else hi = m; }
    var th = (lo + hi) / 2;
    return { th: th, R: h / (1 - Math.cos(th)) };
  };
  EL.curves = function (b, h) {
    var N = 700, line = [], cyc = [], pow = [], c = EL.cycloid(b, h), i;
    for (i = 0; i <= N; i++) {
      var u = Math.pow(i / N, 2);
      line.push([b * u, h * u]);
      var th = c.th * u; cyc.push([c.R * (th - Math.sin(th)), c.R * (1 - Math.cos(th))]);
      pow.push([b * u, h * Math.sqrt(u)]);
    }
    return { line: line, cyc: cyc, pow: pow, c: c };
  };
  // Pendulum H = p²/2 − cos θ; one RK4 step.
  EL.rk4 = function (q, p, dt) {
    var f = function (a, b) { return [b, -Math.sin(a)]; };
    var k1 = f(q, p), k2 = f(q + dt / 2 * k1[0], p + dt / 2 * k1[1]), k3 = f(q + dt / 2 * k2[0], p + dt / 2 * k2[1]), k4 = f(q + dt * k3[0], p + dt * k3[1]);
    return [q + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), p + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
  };

  var PLAY = { key: "play", label: "Motion", type: "choice", value: "on", options: [["on", "Playing"], ["off", "Paused"]] };
  EL.controls = {
    variation: [
      { key: "va", label: "Perturbation", min: -0.6, max: 0.6, step: 0.01, value: 0.35, show: function (v) { return "α = " + num(v); } },
      { key: "veta", label: "Direction η", type: "choice", value: "s1", options: [["s1", "sin πt"], ["s2", "sin 2πt"], ["bump", "bump"]] }
    ],
    "euler-lagrange": [
      { key: "epath", label: "Path", type: "choice", value: "line", options: [["line", "x = t"], ["star", "x = sinh t / sinh 1"]] },
      { key: "ec", label: "Bump center", min: 0.15, max: 0.85, step: 0.01, value: 0.6, show: function (v) { return "c = " + num(v); } }
    ],
    "shortest-path": [],
    brachistochrone: [PLAY],
    "hamilton-principle": [
      { key: "hT", label: "Duration", type: "choice", value: "short", options: [["short", "T = 2"], ["long", "T = 4.5"]] },
      { key: "ha", label: "Perturbation", min: -0.8, max: 0.8, step: 0.01, value: 0.4, show: function (v) { return "α = " + num(v); } }
    ],
    "hamilton-equations": [
      { key: "hE", label: "Energy", min: -0.9, max: 1.8, step: 0.05, value: 0.4, show: function (v) { return "H = " + num(v); } }, PLAY
    ],
    "optimal-control": [{ key: "lr", label: "Control cost", min: -2, max: 2, step: 0.1, value: 0, show: function (v) { return "r = " + (Math.pow(10, v) < 1 ? num(Math.pow(10, v), 2) : num(Math.pow(10, v), 1)); } }]
  };
  EL.wide = { "shortest-path": 1, brachistochrone: 1, "hamilton-equations": 1 };

  specs["euler-lagrange"] = {
    alt: "Figures for the Euler–Lagrange equation: a perturbed path and the functional as a function of the perturbation size, the first variation against a bump test function, a draggable curve compared with the straight line, beads racing down a line, a steep curve and a cycloid, the action of an oscillator, a pendulum's phase portrait, and an optimally controlled double integrator.",
    story: true,
    controls: function (s) { return EL.controls[s.ch] || []; },
    init: function (s, thumb) {
      s.ch = thumb ? "brachistochrone" : "variation";
      for (var c in EL.controls) EL.controls[c].forEach(function (o) { s[o.key] = o.value; });
      s.P = [0.25, 0.85]; s.B = [2, 1]; s.rt = thumb ? 0.55 : 0; s.q = [0, Math.sqrt(2 * (0.4 + 1))]; s.qE = 0.4;
      this.box = thumb ? { l: 12, r: 12, t: 12, b: 12 } : BOX;
    },
    select: function (s, slug) {
      if (!slug || slug === s.ch || !EL.controls[slug]) return false;
      s.ch = slug;
      this.box = EL.wide[slug] ? { l: 12, r: 12, t: 12, b: 12 } : BOX;
      return true;
    },
    render: function (s, p) { return this[s.ch](s, p); },
    animating: function (s) { return (s.ch === "brachistochrone" || s.ch === "hamilton-equations") && s.play === "on"; },
    step: function (s, dt) {
      if (s.ch === "brachistochrone") { s.rt += dt * 0.6; return; }
      var n = 4; for (var i = 0; i < n; i++) s.q = EL.rk4(s.q[0], s.q[1], dt * 1.6 / n);
      if (s.q[0] > Math.PI) s.q[0] -= 2 * Math.PI; if (s.q[0] < -Math.PI) s.q[0] += 2 * Math.PI;
    },
    click: function (s) { if (s.ch === "brachistochrone") { s.rt = 0; return true; } return false; },
    drag: function (s, pt, phase) {
      var sc = this.sc;
      if (!sc || (s.ch !== "shortest-path" && s.ch !== "brachistochrone")) return false;
      var v = s.ch === "shortest-path" ? s.P : [s.B[0], -s.B[1]];
      if (phase === "start") return Math.abs(pt.x - sc.x(v[0])) + Math.abs(pt.y - sc.y(v[1])) < 30;
      if (s.ch === "shortest-path") s.P = [clamp(sc.ix(pt.x), -0.3, 1.3), clamp(sc.iy(pt.y), -0.4, 1.5)];
      else { s.B = [clamp(sc.ix(pt.x), 0.3, 3.4), clamp(-sc.iy(pt.y), 0.3, 1.9)]; s.rt = 0; }
    },
    describe: byBlock({
      variation: "Black: the minimizer <i>x</i>*(<i>t</i>) of <i>J</i>(<i>x</i>) = ∫₀¹ ½<i>ẋ</i>² + ½<i>x</i>² d<i>t</i> with <i>x</i>(0) = 0, <i>x</i>(1) = 1. Brown: the perturbed path <i>x</i>* + α<i>η</i>, with η(0) = η(1) = 0. Inset: <i>J</i>(<i>x</i>* + α<i>η</i>) against α, flat at α = 0.",
      "euler-lagrange": "Blue: the Euler–Lagrange expression δ<i>J</i>(<i>t</i>) = ∂<i>L</i>/∂<i>x</i> − d/d<i>t</i> ∂<i>L</i>/∂<i>ẋ</i> along the chosen path. Dashed: a bump test function η. Brown: their product, whose integral is the first variation in the direction η.",
      "shortest-path": "Black dashed: the straight segment from <i>A</i> to <i>B</i>. Blue: a smooth curve through the draggable control point, with its arc length <i>J</i> = ∫√(1 + <i>y</i>′²) d<i>x</i> in the readout. Every curve is longer than the segment.",
      brachistochrone: "Beads released together from <i>A</i> slide without friction to <i>B</i> under gravity (<i>y</i> points down). Gray: the straight line. Brown: a curve that drops steeply first. Blue: the cycloid, the brachistochrone. Drag <i>B</i>; tap to restart.",
      "hamilton-principle": "Black: the true motion of a harmonic oscillator <i>ẍ</i> = −<i>x</i> from <i>x</i>(0) = 0 to <i>x</i>(<i>T</i>) = 1. Brown: a perturbed path with the same endpoints. Inset: the action <i>S</i> = ∫(½<i>ẋ</i>² − ½<i>x</i>²) d<i>t</i> against α: stationary at α = 0, a minimum for <i>T</i> = 2 but not for <i>T</i> = 4.5.",
      "hamilton-equations": "The phase plane of a pendulum, angle θ across and momentum <i>p</i> up. Gray: level curves of <i>H</i> = <i>p</i>²/2 − cos θ; dashed brown: the separatrix <i>H</i> = 1. Blue: the state moving by Hamilton's equations, and the pendulum it describes (top right).",
      "optimal-control": "A cart <i>ẍ</i> = <i>u</i> steered from <i>x</i> = 1 at rest to 0, minimizing ∫ (<i>x</i>² + <i>r u</i>²) d<i>t</i>. Blue: position <i>x</i>; gray: velocity <i>v</i>; brown: the optimal control <i>u</i> = −<i>k</i>₁<i>x</i> − <i>k</i>₂<i>v</i> from the Riccati equation."
    }),

    variation: function (s, p) {
      var eta = EL.eta[s.veta], a = s.va, x = function (t) { return EL.star(t) + a * eta(t); };
      var sc = scale([-0.05, 1.1], [-0.75, 1.55], { l: 44, r: 230, t: 16, b: 32 }), g = p.g(null), i, A = [], B = [], E = [];
      for (i = 0; i <= 200; i++) { var t = i / 200; A.push([sc.x(t), sc.y(EL.star(t))]); B.push([sc.x(t), sc.y(x(t))]); E.push([sc.x(t), sc.y(0.4 * eta(t) - 0.55)]); }
      p.line(g, sc.x(0), sc.y(0), sc.x(1.08), sc.y(0), "axisline");
      p.line(g, sc.x(0), sc.y(-0.75), sc.x(0), sc.y(1.5), "axisline");
      p.poly(g, E, "curve thin c-muted dash");
      p.poly(g, B, "curve c-warm");
      p.poly(g, A, "curve");
      p.circle(g, sc.x(0), sc.y(0), 4.5, "dot"); p.circle(g, sc.x(1), sc.y(1), 4.5, "dot");
      p.label("va-x", "x^*(t) = \\frac{\\sinh t}{\\sinh 1}", sc.x(0.55), sc.y(EL.star(0.55)) + 6, "se");
      p.label("va-p", "x^* + \\alpha\\eta", sc.x(0.3), sc.y(x(0.3)) - 6, "n");
      p.label("va-e", "\\eta(t) \\ (\\eta(0) = \\eta(1) = 0)", sc.x(0.02), sc.y(-0.67), "e");
      var J0 = EL.J(EL.star), c2 = EL.simpson(function (t) { var v = EL.d(eta, t), y = eta(t); return 0.5 * v * v + 0.5 * y * y; }, 0, 1);
      var Jf = function (al) { return J0 + al * al * c2; };
      EL.inset(p, [395, 40, 185, 150], [-0.65, 0.65], [J0 - 0.1 * c2, J0 + 0.45 * c2], Jf, a, "J(x^* + \\alpha\\eta)", "va-i");
      return "<i>J</i>(<i>x</i>*) = " + num(J0, 4) + ", <i>J</i>(<i>x</i>* + α<i>η</i>) = " + num(EL.J(x), 4) + " &nbsp;·&nbsp; the term linear in α vanishes: <i>J</i>(<i>x</i>* + α<i>η</i>) = <i>J</i>(<i>x</i>*) + α² · " + num(c2, 3) + " exactly, so d<i>J</i>/dα = 0 at α = 0 for every η";
    },

    "euler-lagrange": function (s, p) {
      var opt = s.epath === "star", gfun = function (t) { return opt ? 0 : t; }, c = s.ec, w = 0.13;
      var eta = function (t) { var u = (t - c) / w; return Math.abs(u) < 1 ? Math.pow(1 - u * u, 2) : 0; };
      var sc = scale([-0.05, 1.1], [-0.35, 1.25]), g = p.g(null, true), i, G = [], E = [], P = [];
      for (i = 0; i <= 300; i++) { var t = i / 300; G.push([sc.x(t), sc.y(gfun(t))]); E.push([sc.x(t), sc.y(eta(t))]); P.push([sc.x(t), sc.y(gfun(t) * eta(t))]); }
      p.poly(g, [[sc.x(0), sc.y(0)]].concat(P, [[sc.x(1), sc.y(0)]]), "fill c-warm", true);
      p.poly(g, P, "curve thin c-warm");
      p.poly(g, E, "curve thin dash");
      p.poly(g, G, "curve c-accent");
      p.axes(sc, { xticks: [0.5, 1], yticks: [1], xlabel: "t" });
      p.label("el-g" + s.epath, opt ? "\\delta J = x - \\ddot x = 0" : "\\delta J = x - \\ddot x = t", sc.x(0.92), sc.y(gfun(0.92)) - 8, "nw");
      p.label("el-e", "\\eta(t)", sc.x(c), sc.y(1) - 4, "n");
      p.label("el-p", "\\delta J \\cdot \\eta", sc.x(c) + 0.1 * sc.sx, sc.y(gfun(c) * 0.5) - 4, "w");
      var I = EL.simpson(function (t) { return gfun(t) * eta(t); }, 0, 1, 800);
      return "first variation ⟨δ<i>J</i>, η⟩ = ∫ δ<i>J</i> · η d<i>t</i> = " + num(I, 4) + " &nbsp;·&nbsp; " +
        (opt ? "zero for every bump: this path satisfies the Euler–Lagrange equation" : "positive: moving the path by −εη lowers <i>J</i>, so <i>x</i> = <i>t</i> is not a minimizer");
    },

    "shortest-path": function (s, p) {
      var sc = this.sc = scale([-0.45, 1.55], [-0.5, 1.6], this.box), P0 = [0, 0], P2 = [1, 1], C = s.P, g = p.g(null), i, pts = [], L = 0, prev = null;
      p.rect(g, sc.x(-0.45), sc.y(1.6), 0, 0, "tick");
      for (i = 0; i <= 300; i++) {
        var t = i / 300, q = [(1 - t) * (1 - t) * P0[0] + 2 * t * (1 - t) * C[0] + t * t * P2[0], (1 - t) * (1 - t) * P0[1] + 2 * t * (1 - t) * C[1] + t * t * P2[1]];
        pts.push([sc.x(q[0]), sc.y(q[1])]);
        if (prev) L += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
        prev = q;
      }
      p.line(g, sc.x(0), sc.y(0), sc.x(1), sc.y(1), "curve dash");
      p.poly(g, [[sc.x(0), sc.y(0)], [sc.x(C[0]), sc.y(C[1])], [sc.x(1), sc.y(1)]], "curve thin c-muted dash");
      p.poly(g, pts, "curve c-accent");
      p.circle(g, sc.x(0), sc.y(0), 5.5, "dot"); p.circle(g, sc.x(1), sc.y(1), 5.5, "dot");
      p.circle(g, sc.x(C[0]), sc.y(C[1]), 6, "dot c-warm"); p.circle(g, sc.x(C[0]), sc.y(C[1]), 16, "hitc");
      p.label("sp-a", "A", sc.x(0) - 6, sc.y(0) + 4, "sw");
      p.label("sp-b", "B", sc.x(1) + 6, sc.y(1) - 4, "ne");
      p.label("sp-l", "\\text{dashed: } y = x, \\ \\text{length } \\sqrt 2", sc.x(-0.4), sc.y(1.5), "se");
      p.label("sp-c", "\\text{blue: } J(y) = \\int \\sqrt{1 + y'^2}\\,dx", sc.x(-0.4), sc.y(1.35), "se");
      return "curve length " + num(L, 4) + " vs straight line √2 = " + num(Math.SQRT2, 4) + " (excess " + num(L - Math.SQRT2, 4) + ") &nbsp;·&nbsp; drag the brown control point; the excess is zero only when the curve is the line";
    },

    brachistochrone: function (s, p) {
      var b = s.B[0], h = s.B[1], C = EL.curves(b, h), depth = Math.max(h, C.c.R * 2) * 1.1 + 0.1;
      var sc = this.sc = scale([-0.2, 3.6], [-Math.max(depth, 1.3), 0.35], this.box), X = sc.x, Y = function (y) { return sc.y(-y); }, g = p.g(null), i;
      var tabs = [["line", "c-muted"], ["pow", "c-warm"], ["cyc", "c-accent"]].map(function (c) { return { pts: C[c[0]], T: EL.race(C[c[0]]), cls: c[1], name: c[0] }; });
      var Tmax = Math.max.apply(null, tabs.map(function (t) { return t.T[t.T.length - 1]; }));
      if (s.rt > Tmax + 1.2) s.rt = 0;
      p.line(g, X(-0.2), Y(0), X(3.6), Y(0), "axisline");
      tabs.forEach(function (t) {
        p.poly(g, t.pts.map(function (q) { return [X(q[0]), Y(q[1])]; }), "curve " + (t.name === "cyc" ? "" : "thin ") + t.cls);
        var pos = EL.at(t.pts, t.T, s.rt);
        p.circle(g, X(pos[0]), Y(pos[1]), 7, "dot " + t.cls);
      });
      p.circle(g, X(0), Y(0), 5, "dot"); p.circle(g, X(b), Y(h), 6, "dot"); p.circle(g, X(b), Y(h), 16, "hitc");
      p.label("br-a", "A", X(0) - 6, Y(0) - 4, "nw");
      p.label("br-b", "B", X(b) + 8, Y(h), "e");
      p.label("br-t", "T[y] = \\int \\frac{\\sqrt{1 + y'^2}}{\\sqrt{2 g y}}\\,dx", X(3.55), Y(0) + 8, "sw");
      p.label("br-c", "\\text{blue cycloid: } x = R(\\theta - \\sin\\theta),\\ y = R(1 - \\cos\\theta)", X(3.55), Y(0) + 58, "sw");
      var tL = tabs[0].T[tabs[0].T.length - 1], tP = tabs[1].T[tabs[1].T.length - 1], tC = Math.sqrt(C.c.R / EL.g) * C.c.th;
      return "time to <i>B</i>: line " + num(tL, 3) + " s, steep curve " + num(tP, 3) + " s, cycloid " + num(tC, 3) + " s (fastest) &nbsp;·&nbsp; cycloid radius <i>R</i> = " + num(C.c.R, 3) + " m, Beltrami constant <i>y</i>(1 + <i>y</i>′²) = 2<i>R</i> = " + num(2 * C.c.R, 3) + " &nbsp;·&nbsp; clock " + num(Math.min(s.rt, Tmax), 2) + " s";
    },

    "hamilton-principle": function (s, p) {
      var T = s.hT === "short" ? 2 : 4.5, a = s.ha, xs = function (t) { return Math.sin(t) / Math.sin(T); }, eta = function (t) { return Math.sin(Math.PI * t / T); };
      var x = function (t) { return xs(t) + a * eta(t); };
      var lo = Math.min(-1.3, -1 / Math.abs(Math.sin(T)) - 0.9), hi = Math.max(1.6, 1 / Math.abs(Math.sin(T)) + 0.9);
      var sc = scale([-0.1, T * 1.08], [lo, hi], { l: 44, r: 230, t: 16, b: 32 }), g = p.g(null), i, A = [], B = [];
      for (i = 0; i <= 240; i++) { var t = T * i / 240; A.push([sc.x(t), sc.y(xs(t))]); B.push([sc.x(t), sc.y(x(t))]); }
      p.line(g, sc.x(0), sc.y(0), sc.x(T * 1.06), sc.y(0), "axisline");
      p.line(g, sc.x(0), sc.y(lo), sc.x(0), sc.y(hi), "axisline");
      p.poly(g, B, "curve c-warm");
      p.poly(g, A, "curve");
      p.circle(g, sc.x(0), sc.y(0), 4.5, "dot"); p.circle(g, sc.x(T), sc.y(1), 4.5, "dot");
      p.label("hp-x" + s.hT, "x(t) = \\frac{\\sin t}{\\sin " + T + "}", sc.x(T * 0.05), sc.y(hi) + 4, "se");
      p.label("hp-p", "x + \\alpha \\sin(\\pi t / T)", sc.x(T * 0.05), sc.y(hi) + 34, "se");
      var S = function (y) { return EL.simpson(function (t) { var v = EL.d(y, t), z = y(t); return 0.5 * v * v - 0.5 * z * z; }, 0, T, 600); };
      var S0 = S(xs), c2 = (T / 4) * (Math.PI * Math.PI / (T * T) - 1), Sf = function (al) { return S0 + c2 * al * al; };
      var span = Math.abs(c2) * 0.7 + 1e-3;
      EL.inset(p, [395, 40, 185, 150], [-0.85, 0.85], [S0 - span * (c2 < 0 ? 1 : 0.15), S0 + span * (c2 > 0 ? 1 : 0.15)], Sf, a, "S(x + \\alpha\\eta)", "hp-i");
      return "action <i>S</i> = ∫(<i>K</i> − <i>U</i>) d<i>t</i> = " + num(S(x), 4) + " &nbsp;·&nbsp; <i>S</i>(α) = <i>S</i>₀ + α² · " + num(c2, 3) + ": " +
        (c2 > 0 ? "a minimum, since T < π" : "the true path is a saddle, not a minimum: this direction lowers the action, since T > π") + ". Stationary, always.";
    },

    "hamilton-equations": function (s, p) {
      if (Math.abs(s.hE - s.qE) > 1e-9) { s.qE = s.hE; s.q = [0, Math.sqrt(2 * (s.hE + 1))]; }
      var sc = scale([-3.9, 3.9], [-2.546, 2.546], this.box), X = sc.x, Y = sc.y, g = p.g(null, true), i, k;
      var H = function (q, pp) { return pp * pp / 2 - Math.cos(q); };
      [-0.8, -0.5, -0.1, 0.4, 1.4, 2.2, 3].forEach(function (E) {
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          var pts = [];
          for (i = 0; i <= 240; i++) { var q = -3.9 + 7.8 * i / 240, v = 2 * (E + Math.cos(q)); if (v >= 0) pts.push([X(q), Y(sgn * Math.sqrt(v))]); else if (pts.length) { p.poly(g, pts, "contour"); pts = []; } }
          if (pts.length > 1) p.poly(g, pts, "contour");
        }
      });
      for (k = -1; k <= 1; k += 2) { var sp = []; for (i = 0; i <= 240; i++) { var q2 = -3.9 + 7.8 * i / 240; sp.push([X(q2), Y(k * Math.sqrt(Math.max(0, 2 * (1 + Math.cos(q2)))))]); } p.poly(g, sp, "curve thin c-warm dash"); }
      var E0 = s.hE, orbit = [];
      for (i = 0; i <= 300; i++) { var q3 = -3.9 + 7.8 * i / 300, v3 = 2 * (E0 + Math.cos(q3)); if (v3 >= 0) orbit.push([q3, Math.sqrt(v3)]); }
      p.axes(sc, { xlabel: "\\theta", ylabel: "p" });
      p.circle(g, X(s.q[0]), Y(s.q[1]), 6.5, "dot c-accent");
      var px = X(3.1), py = Y(2.2), Lp = 46, gp = p.g(null);
      p.rect(gp, px - Lp - 10, py - 12, 2 * Lp + 20, Lp + 24, "inset");
      p.line(gp, px, py, px + Lp * Math.sin(s.q[0]), py + Lp * Math.cos(s.q[0]), "curve");
      p.circle(gp, px, py, 3, "dot");
      p.circle(gp, px + Lp * Math.sin(s.q[0]), py + Lp * Math.cos(s.q[0]), 7, "dot c-accent");
      p.label("he-H", "H(\\theta, p) = \\tfrac12 p^2 - \\cos\\theta", X(-3.8), Y(2.45), "se");
      p.label("he-e", "\\dot\\theta = \\partial H / \\partial p = p, \\quad \\dot p = -\\partial H / \\partial \\theta = -\\sin\\theta", X(-3.8), Y(-2.45), "ne");
      p.label("he-s", "H = 1", X(0) + 6, Y(2) - 4, "ne");
      return "θ = " + num(s.q[0], 3) + ", <i>p</i> = " + num(s.q[1], 3) + ", <i>H</i> = " + num(H(s.q[0], s.q[1]), 4) + " (conserved) &nbsp;·&nbsp; " +
        (E0 < 1 ? "<i>H</i> &lt; 1: the pendulum swings back and forth (closed orbit)" : "<i>H</i> &gt; 1: it goes over the top and keeps rotating (open orbit)");
    },

    "optimal-control": function (s, p) {
      var r = Math.pow(10, s.lr), k1 = 1 / Math.sqrt(r), k2 = Math.SQRT2 * Math.pow(r, -0.25), T = Math.round(10 * Math.max(1, Math.pow(r, 0.25))), n = 1600, dt = T / n, xs = [1], vs = [0], us = [], ts = [0], i, J = 0;
      for (i = 0; i < n; i++) {
        var x = xs[i], v = vs[i], u = -k1 * x - k2 * v;
        us.push(u);
        var f = function (a, b) { return [b, -k1 * a - k2 * b]; }, q1 = f(x, v), q2 = f(x + dt / 2 * q1[0], v + dt / 2 * q1[1]), q3 = f(x + dt / 2 * q2[0], v + dt / 2 * q2[1]), q4 = f(x + dt * q3[0], v + dt * q3[1]);
        xs.push(x + dt / 6 * (q1[0] + 2 * q2[0] + 2 * q3[0] + q4[0])); vs.push(v + dt / 6 * (q1[1] + 2 * q2[1] + 2 * q3[1] + q4[1])); ts.push((i + 1) * dt);
      }
      us.push(-k1 * xs[n] - k2 * vs[n]);
      for (i = 0; i < n; i++) J += 0.5 * dt * (xs[i] * xs[i] + r * us[i] * us[i] + xs[i + 1] * xs[i + 1] + r * us[i + 1] * us[i + 1]);
      var all = xs.concat(vs, us), lo = Math.max(Math.min.apply(null, all), -6) - 0.2, hi = Math.max(1.2, Math.min(Math.max.apply(null, all), 6)) + 0.4;
      var sc = scale([-0.3, T * 1.04], [lo, hi]), g = p.g(null, true);
      BS.line(p, g, sc, ts, us.map(function (u) { return clamp(u, lo, hi); }), "curve c-warm");
      BS.line(p, g, sc, ts, vs, "curve thin c-muted");
      BS.line(p, g, sc, ts, xs, "curve c-accent");
      var stp = T / 5;
      p.axes(sc, { xticks: [1, 2, 3, 4, 5].map(function (k) { return Math.round(k * stp); }), yticks: [1], xlabel: "t" });
      p.label("oc-x", "\\text{blue: } x(t)", sc.x(0.6 * T), sc.y(hi) + 4, "se");
      p.label("oc-v", "\\text{gray: } v = \\dot x", sc.x(0.6 * T), sc.y(hi) + 30, "se");
      p.label("oc-u", "\\text{brown: } u = -k_1 x - k_2 v", sc.x(0.6 * T), sc.y(hi) + 56, "se");
      return "<i>r</i> = " + num(r, 2) + ": gains <i>k</i>₁ = 1/√<i>r</i> = " + num(k1, 3) + ", <i>k</i>₂ = √2 <i>r</i><sup>−1/4</sup> = " + num(k2, 3) + " &nbsp;·&nbsp; cost ∫(<i>x</i>² + <i>ru</i>²) d<i>t</i> = " + num(J, 4) + " (Riccati: √2 <i>r</i><sup>1/4</sup> = " + num(Math.SQRT2 * Math.pow(r, 0.25), 4) +
        ") &nbsp;·&nbsp; cheap control (small <i>r</i>) acts hard and fast; expensive control acts gently";
    }
  };

  window.Figures = { specs: specs, mount: mount };
})();
