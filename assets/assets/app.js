// app.js: reads the hidden <article> blocks Jekyll built from _posts/,
// draws the diagram, and shows a block's notes when it is tapped.
(function () {
  "use strict";

  // ---------- helpers ----------
  function $(s) { return document.querySelector(s); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function wide() { return window.matchMedia("(min-width: 900px)").matches; }

  // ---------- 1. read blocks from the page ----------
  var blocks = Array.prototype.map.call(document.querySelectorAll("#blocks article"), function (a) {
    return {
      id: a.dataset.id,
      title: a.querySelector(".b-title").textContent.trim(),
      kind: a.dataset.kind || "layer",       // plain | tensor | core | layer | rail
      tex: (a.dataset.tex || "").trim(),
      from: a.dataset.from || "",
      to: a.dataset.to || "",
      order: parseFloat(a.dataset.order) || 0,
      body: a.querySelector(".b-body"),
      edit: a.dataset.edit || ""
    };
  });
  blocks.sort(function (x, y) { return x.order - y.order; });
  function find(id) { return blocks.filter(function (b) { return b.id === id; })[0] || null; }

  var openId = null;

  // ---------- 2. math ----------
  function typeset(node) {
    var M = window.MathJax;
    if (M && M.typesetPromise) {
      if (M.typesetClear) M.typesetClear([node]);
      M.typesetPromise([node]).then(function () { if (node.id === "diagram") placeRail(); }).catch(function () {});
    }
  }
  window.addEventListener("mj-ready", function () { typeset($("#diagram")); typeset($("#panel")); });

  // ---------- 3. diagram ----------
  function renderDiagram() {
    var d = $("#diagram");
    d.innerHTML = "";
    var stack = el("div", "stack");

    blocks.filter(function (b) { return b.kind !== "rail"; }).forEach(function (b, i) {
      if (i > 0) { var a = el("div", "arrow"); a.setAttribute("aria-hidden", "true"); stack.appendChild(a); }
      var btn = el("button", "block k-" + b.kind);
      btn.type = "button";
      btn.dataset.id = b.id;
      btn.appendChild(el("span", "label", b.title));
      if (b.tex) btn.appendChild(el("span", "tex", "\\(" + b.tex + "\\)"));
      btn.addEventListener("click", function () { open(b.id); });
      stack.appendChild(btn);
    });
    d.appendChild(stack);

    blocks.filter(function (b) { return b.kind === "rail"; }).forEach(function (r) {
      var rb = el("button", "rail");
      rb.type = "button";
      rb.dataset.id = r.id;
      rb.appendChild(el("span", "seg-v"));
      rb.appendChild(el("span", "seg-t"));
      rb.appendChild(el("span", "seg-b"));
      rb.appendChild(el("span", "rail-label", r.title));
      rb.addEventListener("click", function () { open(r.id); });
      d.appendChild(rb);
    });

    syncPressed();
    typeset(d);
    requestAnimationFrame(placeRail);
  }

  // Position each rail so it runs from its `from` block up to its `to` block.
  function placeRail() {
    var d = $("#diagram").getBoundingClientRect();
    document.querySelectorAll("#diagram .rail").forEach(function (rb) {
      var r = find(rb.dataset.id);
      var top = r && document.querySelector('.block[data-id="' + r.to + '"]');
      var bot = r && document.querySelector('.block[data-id="' + r.from + '"]');
      if (!top || !bot) { rb.style.display = "none"; return; }
      rb.style.display = "";
      var tr = top.getBoundingClientRect(), br = bot.getBoundingClientRect();
      var inner = (bot.querySelector(".tex") || bot.querySelector(".label")).getBoundingClientRect();
      var y1 = tr.top + tr.height / 2 - d.top, y2 = br.top + br.height / 2 - d.top;
      var x0 = d.left + 4 + 22;
      rb.style.top = Math.min(y1, y2) + "px";
      rb.style.height = Math.abs(y2 - y1) + "px";
      rb.style.setProperty("--tw", Math.max(10, tr.left - x0 - 2) + "px");
      rb.style.setProperty("--bw", Math.max(10, inner.left - x0 - 10) + "px");
    });
  }
  window.addEventListener("resize", placeRail);

  // ---------- 4. details panel ----------
  function open(id) {
    if (!find(id)) return;
    openId = id;
    history.replaceState(null, "", "#" + id);
    renderPanel();
    syncPressed();
    var h = $("#panel h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: wide() }); }
  }

  function close() {
    var prev = openId;
    openId = null;
    history.replaceState(null, "", location.pathname + location.search);
    renderPanel();
    syncPressed();
    var b = prev && document.querySelector('#diagram [data-id="' + prev + '"]');
    if (b) b.focus();
  }

  function syncPressed() {
    document.querySelectorAll("#diagram [data-id]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.id === openId));
    });
  }

  function renderPanel() {
    var p = $("#panel"), scrim = $("#scrim");
    p.innerHTML = "";
    if (!openId) {
      p.appendChild(el("p", "empty", "Tap any block in the diagram to read its details."));
      p.classList.remove("open");
      scrim.hidden = true;
      return;
    }
    var b = find(openId);
    p.classList.add("open");
    scrim.hidden = wide();

    var head = el("div", "panel-head");
    head.appendChild(el("h2", null, b.title));
    var x = el("button", "close", "×");
    x.type = "button";
    x.setAttribute("aria-label", "Close details");
    x.addEventListener("click", close);
    head.appendChild(x);
    p.appendChild(head);

    if (b.tex) p.appendChild(el("div", "formula", "\\[" + b.tex + "\\]"));

    var notes = el("div", "notes");
    if (b.body && b.body.textContent.trim()) {
      Array.prototype.forEach.call(b.body.childNodes, function (n) { notes.appendChild(n.cloneNode(true)); });
    } else {
      notes.appendChild(el("p", "empty", "No notes yet."));
    }
    p.appendChild(notes);

    if (b.edit) {
      var a = el("a", "edit-link", "Edit this block on GitHub");
      a.href = b.edit;
      a.target = "_blank";
      a.rel = "noopener";
      p.appendChild(a);
    }
    typeset(p);
  }

  // ---------- 5. start ----------
  $("#scrim").addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && openId) close(); });
  window.addEventListener("hashchange", function () {
    var id = location.hash.slice(1);
    if (id && id !== openId) open(id);
  });

  renderDiagram();
  renderPanel();
  var start = location.hash.slice(1);
  if (start && find(start)) open(start);
})();
