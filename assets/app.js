// app.js: reads the hidden <section> diagrams and <article> blocks Jekyll built
// from _data/diagrams.yml and _posts/, and routes on the URL hash:
//   #                  home: filter chips + a card per diagram
//   #<diagram>         that diagram
//   #<diagram>/<block> that diagram with the block's details open
(function () {
  "use strict";

  // ---------- helpers ----------
  function $(s) { return document.querySelector(s); }
  function all(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function wide() { return window.matchMedia("(min-width: 900px)").matches; }
  function text(node, sel) { var n = node.querySelector(sel); return n ? n.textContent.trim() : ""; }
  function titleFromId(id) {
    var s = id.replace(/[-_]+/g, " ").trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ---------- 1. read diagrams and blocks from the page ----------
  var diagrams = all("#diagram-data section").map(function (s) {
    return {
      id: s.dataset.id,
      title: text(s, ".d-title") || titleFromId(s.dataset.id),
      labels: (s.dataset.labels || "").split("|").map(function (l) { return l.trim(); }).filter(Boolean),
      description: text(s, ".d-desc")
    };
  });

  var blocks = all("#blocks article").map(function (a) {
    return {
      id: a.dataset.id,
      diagram: a.dataset.diagram || "unsorted",
      title: text(a, ".b-title"),
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

  // A _posts folder with no diagrams.yml entry still gets a diagram.
  blocks.forEach(function (b) {
    if (!findDiagram(b.diagram)) diagrams.push({ id: b.diagram, title: titleFromId(b.diagram), labels: [], description: "" });
  });

  function findDiagram(id) { return diagrams.filter(function (d) { return d.id === id; })[0] || null; }
  function blocksOf(id) { return blocks.filter(function (b) { return b.diagram === id; }); }
  function find(id) { return cur && blocksOf(cur.id).filter(function (b) { return b.id === id; })[0] || null; }

  var labels = [];
  diagrams.forEach(function (d) { d.labels.forEach(function (l) { if (labels.indexOf(l) < 0) labels.push(l); }); });

  var baseTitle = document.title;
  var cur = null;      // diagram on screen, or null on the home page
  var openId = null;   // open block in cur
  var filter = "";     // active home-page label, "" = all

  // ---------- 2. math ----------
  function typeset(node) {
    var M = window.MathJax;
    if (M && M.typesetPromise) {
      if (M.typesetClear) M.typesetClear([node]);
      M.typesetPromise([node]).then(function () { if (node.id === "diagram") placeRail(); }).catch(function () {});
    }
  }
  window.addEventListener("mj-ready", function () {
    if (cur) { typeset($("#diagram")); typeset($("#panel")); } else typeset($("#cards"));
  });

  // ---------- 3. home page ----------
  function renderHome(message) {
    var notice = $("#notice");
    notice.textContent = message || "";
    notice.hidden = !message;
    renderFilters();
    renderCards();
  }

  function renderFilters() {
    var f = $("#filters");
    f.innerHTML = "";
    f.hidden = labels.length === 0;
    [""].concat(labels).forEach(function (l) {
      var c = el("button", "chip", l || "All");
      c.type = "button";
      c.setAttribute("aria-pressed", String(l === filter));
      c.addEventListener("click", function () {
        filter = l;
        renderFilters();
        renderCards();
        var again = $('#filters .chip[aria-pressed="true"]');
        if (again) again.focus();
      });
      f.appendChild(c);
    });
  }

  function renderCards() {
    var g = $("#cards");
    g.innerHTML = "";
    var shown = diagrams.filter(function (d) { return !filter || d.labels.indexOf(filter) >= 0; });
    if (!shown.length) {
      g.appendChild(el("p", "empty", diagrams.length ? "No diagrams with this label." : "No diagrams yet. Add one to _data/diagrams.yml."));
      return;
    }
    shown.forEach(function (d) {
      var bs = blocksOf(d.id);
      var a = el("a", "card");
      a.href = "#" + d.id;

      var main = el("div", "card-main");
      if (d.labels.length) {
        var tags = el("div", "tags");
        d.labels.forEach(function (l) { tags.appendChild(el("span", "tag", l)); });
        main.appendChild(tags);
      }
      main.appendChild(el("h2", "card-title", d.title));
      if (d.description) main.appendChild(el("p", "card-desc", d.description));
      main.appendChild(el("p", "card-count", bs.length === 1 ? "1 block" : bs.length + " blocks"));
      a.appendChild(main);

      var spine = el("div", "spine");
      spine.setAttribute("aria-hidden", "true");
      bs.filter(function (b) { return b.kind !== "rail"; }).forEach(function (b) {
        spine.appendChild(el("span", "k-" + b.kind));
      });
      a.appendChild(spine);
      g.appendChild(a);
    });
    typeset(g);
  }

  // ---------- 4. diagram view ----------
  function renderView() {
    var d = cur;
    var lab = $("#view-labels");
    lab.innerHTML = "";
    d.labels.forEach(function (l) {
      var c = el("a", "chip chip-sm", l);
      c.href = "#";
      c.title = "All diagrams labeled " + l;
      // Runs before navigation, so the home page renders with this filter.
      c.addEventListener("click", function () { filter = l; });
      lab.appendChild(c);
    });
    lab.hidden = d.labels.length === 0;
    $("#view-title").textContent = d.title;
    $("#view-desc").textContent = d.description;
    $("#view-desc").hidden = !d.description;
    document.title = d.title + " · " + baseTitle;
    renderDiagram();
  }

  function renderDiagram() {
    var d = $("#diagram");
    d.innerHTML = "";
    var bs = blocksOf(cur.id);
    $("#panel").hidden = bs.length === 0;
    if (!bs.length) {
      var p = el("p", "empty", "This diagram has no blocks yet. Add Markdown files to ");
      p.appendChild(el("code", null, "_posts/" + cur.id + "/"));
      p.appendChild(document.createTextNode(" in the repository."));
      d.appendChild(p);
      return;
    }
    var stack = el("div", "stack");

    bs.filter(function (b) { return b.kind !== "rail"; }).forEach(function (b, i) {
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

    bs.filter(function (b) { return b.kind === "rail"; }).forEach(function (r) {
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
    if (!cur) return;
    var d = $("#diagram").getBoundingClientRect();
    all("#diagram .rail").forEach(function (rb) {
      var r = find(rb.dataset.id);
      var top = r && document.querySelector('#diagram .block[data-id="' + r.to + '"]');
      var bot = r && document.querySelector('#diagram .block[data-id="' + r.from + '"]');
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

  // ---------- 5. details panel ----------
  function open(id, quiet) {
    if (!find(id)) return;
    openId = id;
    history.replaceState(null, "", "#" + cur.id + "/" + id);
    renderPanel();
    syncPressed();
    if (quiet) return;
    var h = $("#panel h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: wide() }); }
  }

  function close() {
    var prev = openId;
    openId = null;
    history.replaceState(null, "", "#" + cur.id);
    renderPanel();
    syncPressed();
    var b = prev && document.querySelector('#diagram [data-id="' + prev + '"]');
    if (b) b.focus();
  }

  function syncPressed() {
    all("#diagram [data-id]").forEach(function (b) {
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

  // ---------- 6. routing ----------
  function route(initial) {
    var hash = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    var cut = hash.indexOf("/");
    var did = cut < 0 ? hash : hash.slice(0, cut);
    var bid = cut < 0 ? "" : hash.slice(cut + 1);
    var d = did ? findDiagram(did) : null;

    // Old single-diagram links were #<block>: send them to the block's diagram.
    if (did && !d && !bid) {
      var hit = blocks.filter(function (b) { return b.id === did; });
      if (hit.length === 1) { d = findDiagram(hit[0].diagram); bid = did; }
    }

    // Same diagram already on screen: only the open block changed.
    if (d && d === cur) {
      if (bid && find(bid)) { if (bid !== openId) open(bid); }
      else if (openId) close();
      return;
    }

    cur = d;
    openId = null;
    $("#home").hidden = !!d;
    $("#view").hidden = !d;
    window.scrollTo(0, 0);

    renderPanel();
    if (d) {
      renderView();
      if (bid && find(bid)) open(bid, initial);
      else history.replaceState(null, "", "#" + d.id);
    } else {
      document.title = baseTitle;
      renderHome(did ? "There is no diagram called “" + did + "”. Here are all of them." : "");
      if (did) history.replaceState(null, "", location.pathname + location.search);
    }
    if (!initial) {
      var h = d ? $("#view-title") : $("#home h1");
      h.focus({ preventScroll: true });
    }
  }

  // ---------- 7. start ----------
  $("#scrim").addEventListener("click", function () { if (openId) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && openId) close(); });
  window.addEventListener("hashchange", function () { route(false); });

  route(true);
})();
