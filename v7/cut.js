(function () {
  var root = document.documentElement;
  var cuts = [].slice.call(document.querySelectorAll('[data-cut]'));
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!cuts.length) return;

  // Entrance: content is hidden only after this class exists.
  var canObserve = 'IntersectionObserver' in window;
  if (canObserve) root.classList.add('js');

  cuts.forEach(function (sec) {
    var beats = sec.querySelectorAll('.beat');
    for (var i = 0; i < beats.length; i++) beats[i].style.setProperty('--d', Math.min(i, 8) * 60 + 'ms');
  });

  if (canObserve) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    cuts.forEach(function (s) { io.observe(s); });
    // Safety: anything still hidden after a while is shown.
    setTimeout(function () {
      cuts.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) s.classList.add('in');
      });
    }, 1500);
  }

  // Peak: the request builds word by word under the hand.
  var ask = document.getElementById('ask');
  var peak = ask && ask.closest('.peak');
  var words = [];
  if (ask && canObserve) {
    var parts = ask.textContent.trim().split(/\s+/);
    ask.textContent = '';
    parts.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      ask.appendChild(s);
      if (i < parts.length - 1) ask.appendChild(document.createTextNode(' '));
      words.push(s);
    });
    peak.classList.add('in');
  }

  // Signature: the cutlist rail, one segment per block in its own colour.
  var rail = document.getElementById('rail');
  var segs = [];
  var head = document.createElement('i');
  if (rail) {
    cuts.forEach(function (sec) {
      var a = document.createElement('a');
      a.href = '#' + sec.id;
      a.setAttribute('aria-label', sec.getAttribute('data-title') || sec.id);
      a.title = sec.getAttribute('data-title') || '';
      a.style.setProperty('--seg', getComputedStyle(sec).getPropertyValue('--bg').trim() || getComputedStyle(sec).backgroundColor);
      rail.appendChild(a);
      segs.push(a);
    });
    rail.appendChild(head);
  }

  function sizeRail() {
    var total = document.documentElement.scrollHeight;
    segs.forEach(function (a, i) { a.style.flexGrow = String(Math.max(cuts[i].offsetHeight / total * 100, 0.4)); });
  }

  var ticking = false;
  function frame() {
    ticking = false;
    var y = scrollY, vh = innerHeight;
    var max = Math.max(document.documentElement.scrollHeight - vh, 1);
    var mid = y + vh * 0.5;
    var active = 0;
    for (var i = 0; i < cuts.length; i++) {
      var top = cuts[i].offsetTop;
      if (mid >= top) active = i;
    }
    segs.forEach(function (a, i) { a.classList.toggle('on', i === active); });
    if (rail) {
      var horiz = rail.offsetWidth > rail.offsetHeight;
      var len = horiz ? rail.clientWidth : rail.clientHeight;
      head.style.setProperty('--ph', Math.round((y / max) * (len - 3)) + 'px');
    }
    if (peak && words.length) {
      var r = peak.getBoundingClientRect();
      var travel = Math.max(peak.offsetHeight - vh, 1);
      var p = reduced ? 1 : Math.min(Math.max(-r.top / (travel * 0.8), 0), 1);
      var n = Math.ceil(p * words.length);
      if (r.top > 0) n = reduced ? words.length : 1;
      words.forEach(function (w, i) { w.classList.toggle('on', i < Math.max(n, 1)); });
      peak.style.setProperty('--p', p.toFixed(3));
      peak.style.setProperty('--q', (Math.max(n, 1) / words.length).toFixed(3));
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  function start() {
    sizeRail();
    frame();
    root.classList.add('sc-ready');
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', function () { sizeRail(); onScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { sizeRail(); frame(); });
  start();
})();
