(function () {
  'use strict';

  var root = document.documentElement;
  var main = document.getElementById('guide');
  var thumbs = document.getElementById('thumbs');
  var notice = document.getElementById('notice');
  var select = document.getElementById('lang');
  var langLabel = document.getElementById('lang-label');
  var SVGNS = 'http://www.w3.org/2000/svg';
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var LANGS = [{ code: 'en', name: 'English' }];
  var enCache = null;
  var io = null;
  var currentIO = null;

  var GROUND = {
    '01': 'paper', '02': 'kraft', '03': 'paper', '04': 'sage', '05': 'kraft', '06': 'paper',
    '07': 'sage', '08': 'paper', '09': 'kraft', '10': 'paper', '11': 'sage', '12': 'paper',
    '13': 'kraft', '14': 'ink', '15': 'paper', '16': 'kraft'
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function validCode(c) { return typeof c === 'string' && /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i.test(c); }

  function pickLang() {
    var codes = LANGS.map(function (l) { return l.code; });
    var q = null;
    try { q = new URLSearchParams(location.search).get('lang'); } catch (e) { q = null; }
    if (q && validCode(q)) return q.toLowerCase();
    var nav = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
    for (var i = 0; i < nav.length; i++) {
      var full = String(nav[i] || '').toLowerCase();
      if (codes.indexOf(full) > -1) return full;
      var primary = full.split('-')[0];
      if (codes.indexOf(primary) > -1) return primary;
    }
    return 'en';
  }

  function loadLang(code) {
    var en = enCache ? Promise.resolve(enCache) : getJSON('i18n/en.json').then(function (d) { enCache = d; return d; });
    if (code === 'en') return en.then(function (d) { return { code: 'en', data: d }; });
    return getJSON('i18n/' + code + '.json')
      .then(function (d) {
        if (!d || !Array.isArray(d.slides) || !d.slides.length) throw new Error('empty');
        return { code: code, data: d };
      })
      .catch(function () { return en.then(function (d) { return { code: 'en', data: d }; }); });
  }

  /* ---------- item renderers ---------- */

  function link(item, cls) {
    var a = el('a', cls || 'ref', item.text);
    a.href = item.url;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  function stat(item, ui) {
    var f = el('figure', 'stat rise');
    var v = el('p', 'stat__value', item.value);
    f.appendChild(v);
    var c = el('figcaption', 'stat__text', item.text);
    f.appendChild(c);
    if (item.source) {
      var s = el('p', 'stat__source');
      s.appendChild(el('span', 'stat__source-label', (ui.source || 'Source') + ': '));
      s.appendChild(document.createTextNode(item.source));
      f.appendChild(s);
    }
    return f;
  }

  function card(item) {
    var p = item.parts || [];
    var a = el('article', 'entry rise' + (p.length < 3 ? ' entry--short' : ''));
    a.appendChild(el('p', 'entry__label', p[0] || ''));
    if (p.length >= 3) {
      a.appendChild(el('h3', 'entry__title', p[1]));
      a.appendChild(el('p', 'entry__body', p.slice(2).join(' ')));
    } else if (p.length === 2) {
      a.appendChild(el('p', 'entry__statement', p[1]));
    }
    return a;
  }

  function table(rows) {
    var wrap = el('div', 'ledger rise');
    var t = el('table', 'ledger__table');
    var head = rows[0].parts || [];
    var thead = el('thead');
    var htr = el('tr');
    head.forEach(function (h) { var th = el('th', null, h); th.scope = 'col'; htr.appendChild(th); });
    thead.appendChild(htr);
    t.appendChild(thead);
    var tb = el('tbody');
    rows.slice(1).forEach(function (r) {
      var tr = el('tr');
      (r.parts || []).forEach(function (c, i) {
        var td = el(i === 0 ? 'th' : 'td', null, c);
        if (i === 0) td.scope = 'row';
        td.setAttribute('data-label', head[i] || '');
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    return wrap;
  }

  function band(item) {
    var b = el('p', 'band wipe', item.text);
    return b;
  }

  function steps(list) {
    var ol = el('ol', 'trail');
    list.forEach(function (it) {
      var li = el('li', 'trail__step rise');
      var m = /^(.+?[.!?])\s+(.+)$/.exec(it.text);
      if (m && m[1].length < 60) {
        li.appendChild(el('strong', 'trail__head', m[1]));
        li.appendChild(document.createTextNode(' ' + m[2]));
      } else {
        li.appendChild(document.createTextNode(it.text));
      }
      ol.appendChild(li);
    });
    return ol;
  }

  function questions(list) {
    var ol = el('ol', 'questions');
    list.forEach(function (it) {
      var li = el('li', 'question rise');
      var m = /^(\d+)[.)]\s*(.+)$/.exec(it.text);
      var body = m ? m[2] : it.text;
      if (m) li.appendChild(el('span', 'question__num', m[1] + '.'));
      var p = el('p', 'question__text');
      var k = body.indexOf(':');
      if (k > 0 && k < 60) {
        p.appendChild(el('strong', 'question__topic', body.slice(0, k + 1)));
        p.appendChild(document.createTextNode(' ' + body.slice(k + 1).trim()));
      } else {
        p.textContent = body;
      }
      li.appendChild(p);
      ol.appendChild(li);
    });
    return ol;
  }

  function links(list) {
    var ul = el('ul', 'refs' + (list.length > 6 ? ' refs--index' : ''));
    list.forEach(function (it) {
      var li = el('li', 'refs__item rise');
      li.appendChild(link(it));
      ul.appendChild(li);
    });
    return ul;
  }

  function tryBlock(item, termLinks) {
    var box = el('div', 'try rise');
    box.appendChild(el('p', 'try__label', item.label || ''));
    var ul = el('ul', 'try__terms');
    if (termLinks.length) {
      termLinks.forEach(function (it) { var li = el('li'); li.appendChild(link(it, 'tab')); ul.appendChild(li); });
    } else {
      (item.terms || item.terms_en || []).forEach(function (t) { ul.appendChild(el('li', 'tab', t)); });
    }
    box.appendChild(ul);
    return box;
  }

  /* ---------- decorative planes (no text) ---------- */

  function contours(seed) {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 1000 1000');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    for (var k = 0; k < 16; k++) {
      var r0 = 60 + k * 34;
      var d = '';
      for (var a = 0; a <= 72; a++) {
        var t = (a / 72) * Math.PI * 2;
        var r = r0 * (1 + 0.09 * Math.sin(3 * t + k * 0.37 + seed) + 0.05 * Math.sin(5 * t + 1.3 + k * 0.21) + 0.03 * Math.cos(7 * t + seed));
        var x = 620 + r * Math.cos(t) * 1.25;
        var y = 430 + r * Math.sin(t);
        d += (a === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      var p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', d + 'Z');
      if (k % 4 === 3) p.setAttribute('class', 'index-line');
      svg.appendChild(p);
    }
    return svg;
  }

  function waveform() {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 1200 120');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'wave');
    var d = 'M0 60';
    for (var i = 1; i <= 240; i++) {
      var x = i * 5;
      var env = Math.sin((i / 240) * Math.PI);
      var y = 60 + Math.sin(i * 0.9) * Math.sin(i * 0.13) * 48 * env * env;
      d += ' L' + x + ' ' + y.toFixed(1);
    }
    var p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '1');
    svg.appendChild(p);
    return svg;
  }

  /* ---------- chapters ---------- */

  function cover(s) {
    var sec = el('section', 'chapter cover');
    sec.id = 's' + s.id;
    sec.setAttribute('data-sc-act', 'flow');
    sec.setAttribute('data-ground', GROUND[s.id] || 'paper');
    var back = el('div', 'plane plane--back');
    back.setAttribute('data-depth', '-1.2');
    back.appendChild(contours(0.6));
    sec.appendChild(back);
    var mid = el('div', 'plane plane--frame');
    mid.setAttribute('data-depth', '-0.5');
    mid.setAttribute('aria-hidden', 'true');
    sec.appendChild(mid);
    var t = s.items.map(function (i) { return i.text || ''; });
    var front = el('header', 'cover__type');
    front.appendChild(el('p', 'cover__kicker', t[0] || ''));
    front.appendChild(el('h1', 'cover__title', t[1] || ''));
    front.appendChild(el('p', 'cover__sub', t[2] || ''));
    front.appendChild(el('p', 'cover__meta', t[3] || ''));
    sec.appendChild(front);
    if (t[1]) document.title = t[1];
    return sec;
  }

  function chapter(s, ui) {
    var sec = el('section', 'chapter chapter--' + s.id);
    sec.id = 's' + s.id;
    sec.setAttribute('data-sc-act', 'flow');
    sec.setAttribute('data-ground', GROUND[s.id] || 'paper');
    sec.setAttribute('aria-labelledby', 'h' + s.id);

    var num = el('div', 'numeral', s.id);
    num.setAttribute('aria-hidden', 'true');
    num.setAttribute('data-depth', '-0.9');
    sec.appendChild(num);

    var page = el('div', 'page');
    var margin = el('aside', 'margin');
    var rh = el('p', 'runhead');
    rh.appendChild(el('span', 'runhead__slide', (ui.slide || 'Slide') + ' ' + s.id));
    if (s.label) rh.appendChild(el('span', 'runhead__label', s.label));
    margin.appendChild(rh);
    page.appendChild(margin);

    var body = el('div', 'body');
    var h = el('h2', 'title', s.title || '');
    h.id = 'h' + s.id;
    body.appendChild(h);
    var rule = el('div', 'rule');
    rule.setAttribute('aria-hidden', 'true');
    body.appendChild(rule);

    if (s.id === '05') body.appendChild(waveform());

    var items = s.items || [];
    var tryItem = null;
    items.forEach(function (it) { if (it.type === 'TRY') tryItem = it; });
    var termLinks = tryItem ? items.filter(function (it) { return it.type === 'LINK' && it.keep_en; }) : [];

    var i = 0;
    var firstText = true;
    while (i < items.length) {
      var it = items[i];
      var type = it.type;
      var run = [];
      while (i < items.length && items[i].type === type) { run.push(items[i]); i++; }
      if (type === 'TEXT') {
        run.forEach(function (x) {
          body.appendChild(el('p', (firstText ? 'lede' : 'text') + ' rise', x.text));
          firstText = false;
        });
      } else if (type === 'STAT') {
        var sg = el('div', 'stats');
        run.forEach(function (x) { sg.appendChild(stat(x, ui)); });
        body.appendChild(sg);
      } else if (type === 'CARD') {
        var cg = el('div', 'entries' + (run.length % 2 ? ' entries--odd' : ''));
        run.forEach(function (x) { cg.appendChild(card(x)); });
        body.appendChild(cg);
      } else if (type === 'ROW') {
        body.appendChild(table(run));
      } else if (type === 'BAND') {
        run.forEach(function (x) { body.appendChild(band(x)); });
      } else if (type === 'STEP') {
        body.appendChild(steps(run));
      } else if (type === 'QUESTION') {
        body.appendChild(questions(run));
      } else if (type === 'TRY') {
        run.forEach(function (x) { body.appendChild(tryBlock(x, termLinks)); });
      } else if (type === 'LINK') {
        var rest = run.filter(function (x) { return termLinks.indexOf(x) === -1; });
        if (rest.length) body.appendChild(links(rest));
      } else {
        run.forEach(function (x) { if (x.text) body.appendChild(el('p', 'text rise', x.text)); });
      }
    }
    page.appendChild(body);
    sec.appendChild(page);
    return sec;
  }

  function thumbTab(s, title) {
    var a = el('a', 'thumb');
    a.href = '#s' + s.id;
    a.setAttribute('data-ground', GROUND[s.id] || 'paper');
    a.setAttribute('aria-label', title);
    a.title = title;
    a.appendChild(el('span', 'thumb__num', s.id));
    return a;
  }

  /* ---------- motion ---------- */

  function countUp(n) {
    var target = n.getAttribute('data-count');
    var pct = /%$/.test(target);
    var to = parseInt(target, 10);
    if (reduce || !isFinite(to)) { n.textContent = target; return; }
    var t0 = null;
    var dur = 1400;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      n.textContent = k >= 1 ? target : Math.round(to * e) + (pct ? '%' : '');
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function observe() {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) return;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        t.classList.add('in');
        io.unobserve(t);
        t.querySelectorAll ? t.querySelectorAll('[data-count]').forEach(countUp) : null;
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    main.querySelectorAll('.rise, .wipe, .rule, .wave').forEach(function (n) { io.observe(n); });

    if (currentIO) currentIO.disconnect();
    currentIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        thumbs.querySelectorAll('.thumb').forEach(function (a) {
          if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -54% 0px', threshold: 0 });
    main.querySelectorAll('.chapter').forEach(function (s) { currentIO.observe(s); });
  }

  var depthEls = [];
  var ticking = false;
  function depth() {
    ticking = false;
    var vh = window.innerHeight;
    for (var i = 0; i < depthEls.length; i++) {
      var n = depthEls[i];
      var sec = n.parentNode;
      var r = sec.getBoundingClientRect();
      if (r.bottom < -vh || r.top > 2 * vh) continue;
      var p = (vh - r.top) / (vh + r.height);
      p = Math.max(0, Math.min(1, p));
      var rate = parseFloat(n.getAttribute('data-depth')) || 0;
      n.style.transform = 'translate3d(0,' + (rate * (p - 0.5) * 100).toFixed(1) + 'px,0)';
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(depth); } }

  /* ---------- place keeping ---------- */

  function place() {
    var secs = main.querySelectorAll('.chapter');
    var y = window.innerHeight * 0.3;
    for (var i = 0; i < secs.length; i++) {
      var r = secs[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) return { id: secs[i].id, f: (y - r.top) / Math.max(1, r.height) };
    }
    return null;
  }

  function restore(pl) {
    if (!pl) return;
    var s = document.getElementById(pl.id);
    if (!s) return;
    var top = s.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo(0, Math.max(0, top + pl.f * s.offsetHeight - window.innerHeight * 0.3));
  }

  /* ---------- render ---------- */

  function render(res, keep) {
    var d = res.data;
    var ui = d.ui || (enCache && enCache.ui) || {};
    root.lang = res.code;
    root.setAttribute('data-lang', res.code);
    if (langLabel) langLabel.textContent = ui.language || 'Language';
    select.value = res.code;

    if (res.code !== 'en' && ui.notice) {
      notice.textContent = ui.notice;
      notice.hidden = false;
    } else {
      notice.textContent = '';
      notice.hidden = true;
    }

    var frag = document.createDocumentFragment();
    var tabs = document.createDocumentFragment();
    (d.slides || []).forEach(function (s) {
      if (!s || !s.items) return;
      var sec = s.id === '01' ? cover(s) : chapter(s, ui);
      frag.appendChild(sec);
      var title = s.id === '01' ? ((s.items[1] && s.items[1].text) || s.id) : (s.title || s.id);
      tabs.appendChild(thumbTab(s, title));
    });
    main.textContent = '';
    main.appendChild(frag);
    thumbs.textContent = '';
    thumbs.appendChild(tabs);
    thumbs.setAttribute('aria-label', ui.slide || 'Slide');

    depthEls = reduce ? [] : Array.prototype.slice.call(main.querySelectorAll('[data-depth]'));
    observe();
    depth();
    if (keep) restore(keep);
    root.classList.add('sc-ready');
  }

  function fillMenu() {
    select.textContent = '';
    LANGS.forEach(function (l) {
      var o = el('option', null, l.name || l.code);
      o.value = l.code;
      if (l.en && l.en !== l.name) o.setAttribute('label', l.name);
      select.appendChild(o);
    });
  }

  function switchTo(code) {
    var keep = place();
    loadLang(code).then(function (res) {
      render(res, keep);
      try {
        var u = new URL(location.href);
        u.searchParams.set('lang', res.code);
        history.replaceState(null, '', u.pathname + u.search + u.hash);
      } catch (e) { /* history is optional */ }
    });
  }

  if (!reduce) root.classList.add('fx');

  getJSON('i18n/languages.json')
    .then(function (list) {
      if (Array.isArray(list) && list.length) {
        LANGS = list.filter(function (l) { return l && validCode(l.code); });
        if (!LANGS.some(function (l) { return l.code === 'en'; })) LANGS.unshift({ code: 'en', name: 'English' });
      }
    })
    .catch(function () { /* English only */ })
    .then(function () {
      fillMenu();
      var code = pickLang();
      return loadLang(code);
    })
    .then(function (res) {
      if (!LANGS.some(function (l) { return l.code === res.code; })) {
        LANGS.push({ code: res.code, name: res.code });
        fillMenu();
      }
      render(res, null);
      if (location.hash) {
        var target = document.getElementById(location.hash.slice(1));
        if (target) target.scrollIntoView();
      }
    });

  select.addEventListener('change', function () { switchTo(select.value); });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
