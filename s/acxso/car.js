/* Синхронные карусели первого экрана (перенос механики Hero Section 41 с 21st.dev на обычный JS, без Embla и React).
   Одна общая «позиция» pos на все ленты: листаешь любую — едут все.
   Сами: смена раз в 3 с. Руками: палец или мышь тянут ленту, отпустил — «щелчок» к ближайшему блюду, автосмена идёт дальше.
   Пока палец или кнопка мыши на ленте — автосмена стоит. Вертикальный жест остаётся прокруткой страницы (touch-action: pan-y в CSS).
   Сверх блока: пауза, когда экран ушёл из вида или вкладка скрыта; при «уменьшить движение» автосмены нет, листание руками работает. */
(function () {
  'use strict';
  function wrap(d, n) { d = ((d % n) + n) % n; return d > n / 2 ? d - n : d; }

  window.Car = function (o) {
    var n = o.n, pos = 0, target = 0, from = 0, t0 = 0, raf = 0, tm = 0;
    var dur = o.dur || 650;
    var ease = o.ease || function (t) { return 1 - Math.pow(1 - t, 4); };
    var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var visible = true, holds = 0, started = false;

    function rel(i) { return wrap(i - pos, n); }
    function draw() { o.render(rel, pos); }
    function active() { if (o.onActive) o.onActive(((Math.round(target) % n) + n) % n); }
    function frame(now) {
      var t = Math.min(1, (now - t0) / dur);
      pos = from + (target - from) * ease(t);
      draw();
      raf = t < 1 ? requestAnimationFrame(frame) : 0;
    }
    function arm() {
      clearTimeout(tm);
      if (!started || reduce || !visible || holds > 0 || document.hidden) return;
      tm = setTimeout(auto, o.delay || 3000);
    }
    function auto() {
      var nx = Math.round(target) + 1;
      /* на медленной сети следующее фото может быть ещё в пути — тогда ждём его, а не показываем пустое место */
      if (o.ready && !o.ready(((nx % n) + n) % n)) { tm = setTimeout(auto, 400); return; }
      go(nx);
    }
    function go(to) {
      target = to; from = pos; t0 = performance.now();
      if (reduce) { pos = target; draw(); }
      else if (!raf) raf = requestAnimationFrame(frame);
      active(); arm();
    }
    function goIndex(i) { var b = Math.round(target); go(b + wrap(i - b, n)); }

    /* el — что тянут; unit() — сколько пикселей пути пальца равны одному блюду */
    function bind(el, unit) {
      var x0, y0, p0, w, moved, id = null, lastX, lastT, v, dragAt = 0;
      el.addEventListener('pointerdown', function (e) {
        if (id !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
        x0 = e.clientX; y0 = e.clientY; p0 = pos; w = unit() || 1; moved = false; id = e.pointerId;
        lastX = x0; lastT = e.timeStamp; v = 0;
        holds++; clearTimeout(tm);           /* палец или мышь на карусели — автосмена ждёт */
      });
      window.addEventListener('pointermove', function (e) {
        if (id !== e.pointerId) return;
        var dx = e.clientX - x0, dy = e.clientY - y0;
        if (!moved) {
          if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;   /* вертикальный жест — это прокрутка страницы */
          moved = true; cancelAnimationFrame(raf); raf = 0;
          p0 = pos; x0 = e.clientX;          /* лента берётся с того места, где её застал палец, без скачка */
          dx = 0;
          el.classList.add('drag');
          try { el.setPointerCapture(id); } catch (_) {}
        }
        var dt = Math.max(1, e.timeStamp - lastT);
        v = 0.6 * v + 0.4 * (e.clientX - lastX) / dt; lastX = e.clientX; lastT = e.timeStamp;
        pos = p0 - dx / w; target = pos; draw();
      });
      function end(e) {
        if (id !== e.pointerId) return;
        id = null; holds = Math.max(0, holds - 1);
        el.classList.remove('drag');
        if (!moved) { arm(); return; }       /* просто касание — автосмена продолжается через обычную паузу */
        dragAt = Date.now();
        if (e.timeStamp - lastT > 120) v = 0;                 /* подержал и отпустил — без броска */
        var d = pos - p0, to;
        if (Math.abs(v) > 0.25) to = v < 0 ? Math.ceil(pos) : Math.floor(pos);      /* свайп: следующее блюдо по ходу пальца */
        else to = Math.round(pos + (d > 0 ? 0.28 : d < 0 ? -0.28 : 0));             /* медленно: хватит протащить на пятую часть */
        go(to);                              /* «щелчок» к блюду; отсюда же автосмена считает свои 3 с */
      }
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      el.addEventListener('click', function (e) {
        if (Date.now() - dragAt < 350) { e.preventDefault(); e.stopPropagation(); }   /* конец перетаскивания — не клик по миниатюре */
      }, true);
      el.addEventListener('dragstart', function (e) { e.preventDefault(); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(Math.round(target) + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); go(Math.round(target) - 1); }
      });
    }

    if (o.watch && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; arm(); }, { threshold: 0.15 }).observe(o.watch);
    }
    document.addEventListener('visibilitychange', arm);
    draw(); active();

    return {
      go: go, goIndex: goIndex, bind: bind,
      next: function () { go(Math.round(target) + 1); },
      start: function () { started = true; arm(); }
    };
  };

  function hide(el, on) {
    if (on) { if (!el._h) { el.style.visibility = 'hidden'; el._h = 1; } }
    else if (el._h) { el.style.visibility = ''; el._h = 0; }
  }

  /* Лента, которая едет вбок: у каждого слайда сдвиг = расстояние до активного * (своя ширина + зазор).
     soft = {from, to, scale, step}: слайд гаснет между from и to (в долях шага), чуть уменьшается и за один шаг
     проезжает только step своей ширины — блюдо растворяется раньше, чем дойдёт до края своей зоны, и не торчит половиной. */
  Car.slide = function (items, gap, hideAt, soft) {
    return function (rel) {
      for (var i = 0; i < items.length; i++) {
        var d = rel(i), el = items[i], a = Math.abs(d);
        if (a > hideAt) { hide(el, 1); continue; }
        hide(el, 0);
        var tf = 'translate3d(calc(' + (d * (soft && soft.step || 1)).toFixed(4) + ' * (100% + ' + gap + 'px)),0,0)';
        if (soft) {
          var k = Math.min(1, Math.max(0, (a - soft.from) / (soft.to - soft.from)));
          el.style.opacity = (1 - k * k * (3 - 2 * k)).toFixed(3);
          if (soft.scale) tf += ' scale(' + (1 - soft.scale * Math.min(1, a)).toFixed(4) + ')';
        }
        el.style.transform = tf;
      }
    };
  };

  /* Подпись: старая гаснет и чуть уходит, новая проявляется на её месте. Текст не режется краем.
     x — сдвиг в пикселях, y — в процентах своей высоты на один шаг; span — на какой доле шага гаснет. */
  Car.swap = function (items, x, y, span) {
    return function (rel) {
      for (var i = 0; i < items.length; i++) {
        var d = rel(i), el = items[i], a = Math.abs(d);
        if (a >= span) { hide(el, 1); continue; }
        hide(el, 0);
        el.style.opacity = (1 - a / span).toFixed(3);
        el.style.transform = 'translate3d(' + (d * x).toFixed(2) + 'px,' + (d * y).toFixed(2) + '%,0)';
      }
    };
  };

  /* Остальные фото грузим по очереди после первого, чтобы не мешали первому. */
  Car.loadRest = function (imgs) {
    var i = 0;
    (function next() {
      while (i < imgs.length && !imgs[i].getAttribute('data-src')) i++;
      if (i >= imgs.length) return;
      var im = imgs[i++];
      im.onload = im.onerror = next;
      if (im.getAttribute('data-srcset')) im.srcset = im.getAttribute('data-srcset');
      im.src = im.getAttribute('data-src');
    })();
  };

  /* Запуск первого экрана: ждём шрифты и первое фото, но не дольше 2,4 с. Через 3 с без запуска страница
     уже показана как есть (класс plain из <head>) — тогда анимацию входа не включаем. */
  Car.intro = function (fonts, firstImg, cb) {
    var d = document.documentElement, done = false;
    function start() {
      if (done) return; done = true;
      if (!d.classList.contains('plain')) { clearTimeout(window.__plain); d.classList.remove('pre'); d.classList.add('go'); }
      cb();
    }
    var ps = [];
    if (document.fonts && document.fonts.load) fonts.forEach(function (f) { ps.push(document.fonts.load(f[0], f[1])); });
    if (firstImg && !firstImg.complete) ps.push(new Promise(function (r) { firstImg.addEventListener('load', r); firstImg.addEventListener('error', r); }));
    Promise.all(ps).then(start, start);
    setTimeout(start, 2400);
  };
})();
