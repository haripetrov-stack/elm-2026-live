(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js-on");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var crossMQ = window.matchMedia("(min-width: 1000px) and (min-height: 700px)");
  var world = document.getElementById("world");
  var terrain = world.querySelector(".terrain");
  var svgs = terrain.querySelectorAll("svg");
  var topoPath = document.getElementById("topo-lines");
  var ahead = terrain.querySelector(".road__ahead");
  var walked = terrain.querySelector(".road__walked");
  var lamp = terrain.querySelector(".lantern");
  var halo = terrain.querySelector(".lantern__halo");
  var stops = Array.prototype.slice.call(world.querySelectorAll(".stop"));
  var pins = stops.map(function (s) { return s.querySelector(".pin"); });
  var STEP = 8;
  var total = 0, samples = [], pinYs = [], W = 0, H = 0;

  /* Contour lines of the landscape: one path, many rows, bunching and spreading slowly. */
  function contours() {
    var d = [];
    var dx = W < 700 ? 18 : 28;
    var gap = W < 700 ? 52 : 68;
    for (var b = 30; b < H + gap; b += gap) {
      var row = [];
      for (var x = -dx; x <= W + dx; x += dx) {
        var y = b + 26 * Math.sin(x * 0.0041 + b * 0.0023) + 13 * Math.sin(x * 0.0107 - b * 0.0039 + 1.3) + 6 * Math.sin((x + b) * 0.021);
        row.push((row.length ? "L" : "M") + x + " " + y.toFixed(1));
      }
      d.push(row.join(""));
    }
    return d.join("");
  }

  function rel(el) {
    var r = el.getBoundingClientRect(), w = world.getBoundingClientRect();
    return { x: r.left - w.left + r.width / 2, y: r.top - w.top + r.height / 2, bottom: r.bottom - w.top };
  }

  function build() {
    doc.classList.toggle("js-cross", crossMQ.matches && !reduce.matches);
    W = world.clientWidth;
    H = world.offsetHeight;
    for (var i = 0; i < svgs.length; i++) {
      svgs[i].setAttribute("width", W);
      svgs[i].setAttribute("height", H);
      svgs[i].setAttribute("viewBox", "0 0 " + W + " " + H);
    }
    topoPath.setAttribute("d", contours());

    var pts = stops.map(function (s, k) {
      var p = rel(pins[k]);
      var b = rel(s).bottom - 20;
      return { x: p.x, y: p.y, b: Math.max(p.y, b) };
    });
    pinYs = pts.map(function (p) { return p.y; });
    var d = "M" + pts[0].x + " " + pts[0].y;
    pts.forEach(function (p, k) {
      if (k > 0) {
        var q = pts[k - 1], half = (p.y - q.b) / 2;
        d += "C" + q.x + " " + (q.b + half) + " " + p.x + " " + (p.y - half) + " " + p.x + " " + p.y;
      }
      if (k < pts.length - 1 && p.b > p.y) d += "L" + p.x + " " + p.b;
    });
    ahead.setAttribute("d", d);
    walked.setAttribute("d", d);
    total = walked.getTotalLength();
    samples = [];
    for (var l = 0; l <= total; l += STEP) {
      var pt = walked.getPointAtLength(l);
      samples.push([l, pt.x, pt.y]);
    }
    walked.style.strokeDasharray = total + " " + total;
    buildCross();
    frame();
  }

  /* The lantern: the head of the walked road follows a line 62% down the screen. */
  function road() {
    if (!samples.length) return;
    var top = world.getBoundingClientRect().top;
    var target = -top + window.innerHeight * 0.62;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) target = H;
    var idx;
    if (reduce.matches) {
      idx = samples.length - 1;
    } else {
      var lo = 0, hi = samples.length - 1;
      while (lo < hi) {
        var mid = (lo + hi + 1) >> 1;
        if (samples[mid][2] <= target) lo = mid; else hi = mid - 1;
      }
      idx = lo;
    }
    var s = samples[idx];
    var len = idx === samples.length - 1 ? total : s[0];
    walked.style.strokeDashoffset = String(total - len);
    lamp.setAttribute("cx", s[1]); lamp.setAttribute("cy", s[2]);
    halo.setAttribute("cx", s[1]); halo.setAttribute("cy", s[2]);
    terrain.style.setProperty("--lx", s[1] + "px");
    terrain.style.setProperty("--ly", s[2] + "px");
    for (var k = 0; k < pins.length; k++) pins[k].classList.toggle("is-lit", pinYs[k] <= s[2] + 2);
  }

  /* Hero ridges: three planes, each slower than the one in front of it. */
  var ridges = document.querySelectorAll(".ridge");
  var rates = [0.34, 0.17, 0];
  function hero() {
    var y = window.scrollY;
    if (y > window.innerHeight * 1.5) return;
    for (var i = 0; i < ridges.length; i++) {
      ridges[i].style.transform = reduce.matches ? "" : "translate3d(0," + (y * rates[i]).toFixed(1) + "px,0)";
    }
  }

  /* The crossroads: six trails leave one node; each lights as the page holds still. */
  var cross = document.querySelector(".stop--cross");
  var field = cross.querySelector(".cross__field");
  var trailSvg = cross.querySelector(".cross__trails");
  var trails = Array.prototype.slice.call(cross.querySelectorAll(".trail"));
  var qs = Array.prototype.slice.call(cross.querySelectorAll(".q"));
  function buildCross() {
    if (!crossMQ.matches) return;
    var f = field.getBoundingClientRect();
    trailSvg.setAttribute("viewBox", "0 0 " + f.width + " " + f.height);
    var nx = f.width / 2, ny = f.height / 2;
    qs.forEach(function (q, i) {
      var r = q.getBoundingClientRect();
      var left = i % 2 === 0;
      var ex = left ? r.right - f.left : r.left - f.left;
      var ey = r.top - f.top + r.height / 2;
      var c = (ex - nx) * 0.6;
      trails[i].setAttribute("d", "M" + nx + " " + ny + "C" + (nx + c) + " " + ny + " " + (ex - c * 0.4) + " " + ey + " " + ex + " " + ey);
    });
  }
  function crossroads() {
    if (!doc.classList.contains("js-cross")) return;
    var r = cross.getBoundingClientRect();
    var travel = r.height - window.innerHeight;
    var p = Math.min(1, Math.max(0, -r.top / travel));
    var now = Math.min(5, Math.floor(p * 6.6));
    qs.forEach(function (q, i) {
      q.classList.toggle("is-lit", i <= now);
      q.classList.toggle("is-now", i === now && p < 0.97);
      trails[i].classList.toggle("is-lit", i <= now);
    });
  }

  var queued = false;
  function frame() { queued = false; road(); hero(); crossroads(); }
  function onScroll() { if (!queued) { queued = true; window.requestAnimationFrame(frame); } }
  window.addEventListener("scroll", onScroll, { passive: true });

  var sized = 0;
  function rebuild() { if (!sized) { sized = 1; window.requestAnimationFrame(function () { sized = 0; build(); }); } }
  window.addEventListener("resize", rebuild);
  if (window.ResizeObserver) new ResizeObserver(rebuild).observe(world);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  if (crossMQ.addEventListener) { crossMQ.addEventListener("change", rebuild); reduce.addEventListener("change", rebuild); }

  /* Words of the kinetic band. */
  Array.prototype.forEach.call(document.querySelectorAll(".kin"), function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach(function (w, i) {
      var span = document.createElement("span");
      span.className = "w";
      span.style.setProperty("--i", i);
      span.textContent = w;
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });

  /* Numbers of stop 02 land once, ending on the written value. */
  function countUp(el) {
    var final = el.textContent;
    var m = final.match(/^(\d+)(%?)$/);
    if (!m || reduce.matches) return;
    var to = +m[1], suffix = m[2], t0 = performance.now(), dur = 1400;
    function tick(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? Math.round(to * e) + suffix : final;
      if (k < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  /* Entrances fire once; nothing re-hides on the way back up. */
  var watched = document.querySelectorAll(".rise, .wipe, .veil, .kin, .num");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.classList.contains("num")) countUp(el); else el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    var veilIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); veilIo.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -38% 0px" });
    Array.prototype.forEach.call(watched, function (el) {
      (el.classList.contains("veil") ? veilIo : io).observe(el);
    });
  } else {
    Array.prototype.forEach.call(watched, function (el) { el.classList.add("is-in"); });
  }

  build();
  doc.classList.add("sc-ready");
})();
