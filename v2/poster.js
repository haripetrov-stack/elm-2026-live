(function () {
  var d = document, H = d.documentElement;
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
  H.classList.add("sig");

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function prog(sec) {
    var r = sec.getBoundingClientRect();
    return clamp01(-r.top / Math.max(1, r.height - innerHeight));
  }
  function all(sel, root) { return Array.prototype.slice.call((root || d).querySelectorAll(sel)); }

  /* split a heading into word spans, keeping child elements whole */
  function split(el, cls) {
    var out = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = d.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (s) {
          if (!s) return;
          if (/^\s+$/.test(s)) { frag.appendChild(d.createTextNode(s)); return; }
          var sp = d.createElement("span"); sp.className = cls; sp.textContent = s;
          frag.appendChild(sp); out.push(sp);
        });
        el.replaceChild(frag, n);
      } else if (n.nodeType === 1) { n.classList.add(cls); out.push(n); }
    });
    return out;
  }

  /* entrance effects: the hiding classes exist only once this script runs */
  var io = null;
  if (!RM && "IntersectionObserver" in window) {
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.classList.contains("rv-pre")) el.classList.add("rv-in");
        if (el.classList.contains("wp-pre")) el.classList.add("wp-in");
        if (el.classList.contains("kin-pre")) el.classList.add("kin-in");
        if (el.hasAttribute("data-count")) count(el);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    all(".rv").forEach(function (el) {
      var sib = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.transitionDelay = (sib * 70) + "ms";
      el.classList.add("rv-pre"); io.observe(el);
    });
    all(".wp").forEach(function (el) { el.classList.add("wp-pre"); io.observe(el); });
    all(".kin").forEach(function (el) {
      split(el, "kw").forEach(function (w, i) { w.style.transitionDelay = (i * 80) + "ms"; });
      el.classList.add("kin-pre"); io.observe(el);
    });
    all("[data-count]").forEach(function (el) { io.observe(el); });
  }

  /* numbers land: the final value is in the HTML, the count only replays it */
  function count(el) {
    var txt = el.textContent, n = parseInt(txt.replace(/[^0-9]/g, ""), 10), suf = txt.replace(/[0-9,]/g, "");
    if (!n) return;
    var t0 = performance.now(), dur = 1400;
    function step(now) {
      var k = clamp01((now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(n * e) + suf;
      if (k < 1) requestAnimationFrame(step); else el.textContent = txt;
    }
    requestAnimationFrame(step);
  }

  /* 06: the rail pans sideways on wide screens */
  var pan = d.querySelector("[data-pan]"), rail = pan && pan.querySelector(".rail");
  var mqPan = matchMedia("(min-width: 900px) and (min-height: 640px)");
  function panMode() {
    if (!pan) return;
    if (!RM && mqPan.matches) pan.classList.add("is-pan");
    else { pan.classList.remove("is-pan"); rail.style.transform = ""; }
  }
  panMode();
  if (mqPan.addEventListener) mqPan.addEventListener("change", panMode);

  /* 13: the three giant words drift at different rates */
  var par = (RM || innerWidth < 760) ? [] : all("[data-par]");

  /* 15: the request assembles word by word inside the red */
  var peak = d.querySelector(".peak"), words = [];
  if (peak && !RM) { words = split(peak.querySelector(".ask"), "pw"); peak.classList.add("pk"); }

  /* the signature: one red block that lands behind the key line of each poster */
  var blk = d.createElement("div"); blk.id = "blk"; blk.setAttribute("aria-hidden", "true");
  d.body.insertBefore(blk, d.body.firstChild);
  var marks = all("[data-mark]");
  var cur = null, lit = null, from = null, t0 = 0, pos = null, hover = null, DUR = RM ? 0 : 560;

  if (FINE && !RM) {
    all(".terms a").forEach(function (a) {
      a.addEventListener("mouseenter", function () { hover = a; });
      a.addEventListener("mouseleave", function () { if (hover === a) hover = null; });
    });
  }
  all(".terms a").forEach(function (a) {
    a.addEventListener("focus", function () { hover = a; });
    a.addEventListener("blur", function () { if (hover === a) hover = null; });
  });

  function rectOf(el) {
    var r = el.getBoundingClientRect(), p = parseFloat(el.getAttribute("data-pad") || "10");
    if (el === hover) p = 4;
    var x = Math.max(0, r.left - p), x2 = Math.min(innerWidth, r.right + p);
    return { x: x, y: r.top - p, w: Math.max(0, x2 - x), h: r.height + 2 * p };
  }
  function allowed(el) {
    var g = el.closest("[data-steps]");
    if (!g) return true;
    var st = g.querySelector(".stage");
    if (!st || getComputedStyle(st).position !== "sticky") return true;
    var list = all("[data-mark]", g);
    return list.indexOf(el) === Math.min(list.length - 1, Math.floor(prog(g) * list.length));
  }
  function pick() {
    if (hover) return hover;
    var fx = innerWidth / 2, fy = innerHeight * 0.45, best = null, bd = 1e9;
    for (var i = 0; i < marks.length; i++) {
      var el = marks[i], r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      if (!allowed(el)) continue;
      var cx = Math.max(r.left, Math.min(fx, r.right)), cy = Math.max(r.top, Math.min(fy, r.bottom));
      var dd = Math.hypot(cx - fx, cy - fy);
      if (dd < bd) { bd = dd; best = el; }
    }
    return best || cur;
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    if (pan && pan.classList.contains("is-pan")) {
      var ov = rail.scrollWidth - pan.querySelector(".stage").clientWidth + 64;
      rail.style.transform = "translate3d(" + (-prog(pan) * Math.max(0, ov)).toFixed(1) + "px,0,0)";
    }
    for (var i = 0; i < par.length; i++) {
      var r = par[i].getBoundingClientRect(), off = (r.top + r.height / 2 - innerHeight / 2);
      par[i].style.transform = "translate3d(0," + (-off * parseFloat(par[i].getAttribute("data-par"))).toFixed(1) + "px,0)";
    }
    if (words.length) {
      var p = prog(peak), n = words.length;
      for (var j = 0; j < n; j++) words[j].classList.toggle("on", p >= (j / n) * 0.55);
    }

    var nt = pick();
    if (nt !== cur) {
      if (lit) { lit.classList.remove("lit"); lit = null; }
      from = pos; cur = nt; t0 = now;
    }
    if (cur) {
      var t = rectOf(cur), k = (DUR && from) ? clamp01((now - t0) / DUR) : 1, e = ease(k);
      pos = from && k < 1 ? {
        x: from.x + (t.x - from.x) * e, y: from.y + (t.y - from.y) * e,
        w: from.w + (t.w - from.w) * e, h: from.h + (t.h - from.h) * e
      } : t;
      if (k >= 1 && lit !== cur) { cur.classList.add("lit"); lit = cur; }
      blk.style.transform = "translate3d(" + pos.x.toFixed(1) + "px," + pos.y.toFixed(1) + "px,0) scale(" + (pos.w / 100).toFixed(4) + "," + (pos.h / 100).toFixed(4) + ")";
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  H.classList.add("sc-ready");
})();
