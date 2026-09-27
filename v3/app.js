// Split stage: evidence lights the claim.
// Each statement is split into words; as its evidence column passes the reading
// line, word after word fills with ink. The peak act has no evidence, so it stays hollow.
(function () {
  "use strict";
  var root = document.documentElement;
  var chapters = Array.prototype.slice.call(document.querySelectorAll("[data-claim]"));
  var acts = [];

  chapters.forEach(function (ch) {
    var h = ch.querySelector(".stmt");
    if (!h) return;
    var words = h.textContent.trim().split(/\s+/);
    h.textContent = "";
    var spans = words.map(function (w, i) {
      var s = document.createElement("span");
      s.className = "w";
      s.textContent = w;
      h.appendChild(s);
      if (i < words.length - 1) h.appendChild(document.createTextNode(" "));
      return s;
    });
    acts.push({
      ch: ch,
      mode: ch.getAttribute("data-claim"),
      spans: spans,
      ev: ch.querySelector(".evidence"),
      pp: Array.prototype.slice.call(ch.querySelectorAll(".pp")),
      lit: -1
    });
  });

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function setLit(a, n) {
    if (n === a.lit) return;
    a.lit = n;
    for (var i = 0; i < a.spans.length; i++) a.spans[i].classList.toggle("lit", i < n);
    a.ch.classList.toggle("proven", n === a.spans.length);
  }

  function frame() {
    var vh = window.innerHeight;
    var line = vh * 0.62;
    for (var k = 0; k < acts.length; k++) {
      var a = acts[k];
      var r = a.ch.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;
      var n = a.spans.length;
      if (a.mode === "open") { setLit(a, n); continue; }
      if (a.mode === "hollow") {
        setLit(a, 0);
        var travel = Math.max(1, r.height - vh);
        var pp = clamp(-r.top / travel);
        a.ch.style.setProperty("--pp", pp.toFixed(3));
        for (var j = 0; j < a.pp.length; j++) {
          if (pp > 0.03 + j * 0.3 || r.top < -travel * 0.98) a.pp[j].classList.add("on");
        }
        continue;
      }
      var e = a.ev.getBoundingClientRect();
      var p = clamp((line - e.top) / Math.max(1, e.height - vh * 0.3));
      setLit(a, p <= 0 ? 0 : Math.min(n, Math.ceil(p * n)));
    }
  }

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () { queued = false; frame(); });
  }

  // entrance for evidence items: fires once, never re-hides
  var items = Array.prototype.slice.call(document.querySelectorAll(".ev"));
  var vh0 = window.innerHeight;
  items.forEach(function (el) {
    if (el.getBoundingClientRect().top < vh0 * 0.92) el.classList.add("in");
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting || en.boundingClientRect.top < 0) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });
    items.forEach(function (el) { if (!el.classList.contains("in")) io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  frame();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  root.classList.add("js");
  root.classList.add("sc-ready");
})();
