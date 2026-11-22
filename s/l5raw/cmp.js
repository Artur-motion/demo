/* Шторка «до/после» — перенос блока Image Compare (21st.dev, @aadixc0de, «From chatcn») с React на обычный JS.
   Перенесено 1:1: два слоя и clip-path; ручка на отдельной дорожке, двигается только transform;
   палец: первые 6 px жест ничей, вверх-вниз страница листается (touch-action: pan-y);
   тап или клик — ручка доезжает за 180 мс, cubic-bezier(.23,1,.32,1); мышь тянет сразу;
   клавиатура: стрелки ±1, с Shift ±10, PageUp/PageDown ±10, Home/End; подписи гаснут рядом с ручкой (150 мс);
   нажатие сжимает захват до 0,94; фото проявляется за 200 мс.
   Убрано: число «50 / 50», значок «нет картинки», автопрокрутка из демо (шторку двигает только человек).
   Добавлено: наклонная линия раздела — data-slant="7" (в процентах ширины).
   Края (22.11): шторка закрывается и открывается полностью, не дожидаясь, пока палец выйдет за фото:
   — захват целиком остаётся в кадре; когда он упёрся в край, фото уже закрыто полностью:
     на последней трети пути линия плавно обгоняет палец и уходит под захватом к самому краю;
   — у наклонной линии ход длиннее на её наклон, иначе в углу оставался треугольник второго фото;
   — отпустили ближе 2,5 % от края — шторка доезжает до края сама. */
(function () {
  'use strict';
  var JUMP_MS = 180, TOUCH_SLOP = 6, SNAP = 2.5;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

  function init(root) {
    var before = root.querySelector('.cmp-before');
    var track = root.querySelector('.cmp-track');
    var line = root.querySelector('.cmp-line');
    var grip = root.querySelector('.cmp-grip');
    var lblB = root.querySelector('.cmp-lbl-b');
    var lblA = root.querySelector('.cmp-lbl-a');
    var slant = parseFloat(root.getAttribute('data-slant') || '0') || 0;   /* наклон линии, % ширины */
    var span = 100 + 2 * slant;                                            /* полный ход линии, % ширины */
    var val = clamp(parseFloat(root.getAttribute('data-pos') || '50'), 0, 100); /* 0 — видно только «после», 100 — только «до» */
    var W = 0, H = 0, half = 26, lblY = 0, wB = 0, wA = 0, raf = 0, glideTimer = 0, drag = null;

    /* где линия на средней высоте, % ширины: от −slant до 100 + slant */
    function center() { return val / 100 * span - slant; }

    function paint() {
      raf = 0;
      var c = center();
      before.style.clipPath = slant
        ? 'polygon(0 0,' + (c + slant) + '% 0,' + (c - slant) + '% 100%,0 100%)'
        : 'inset(-1px ' + (val >= 100 ? '-1px' : (100 - c) + '%') + ' -1px -1px)'; /* −1px: неподвижные края без полупрозрачной кромки */
      track.style.transform = 'translate3d(' + c + '%,0,0)';
      var cx = c / 100 * W;
      /* захват не выходит за кадр: у края стоит, линия идёт дальше */
      grip.style.transform = W ? 'translate3d(' + (clamp(cx, half, W - half) - cx) + 'px,0,0)' : '';
      if (line) line.style.opacity = val <= 0 || val >= 100 ? '0' : '';
      grip.setAttribute('aria-valuenow', String(Math.round(val)));
      var lx = cx + slant / 100 * W * (1 - 2 * lblY / (H || 1));          /* линия на высоте подписей */
      if (lblB) lblB.style.opacity = lx < wB + 24 ? '0' : '1';
      if (lblA) lblA.style.opacity = W - lx < wA + 24 ? '0' : '1';
    }

    function measure() {
      var r = root.getBoundingClientRect();
      W = r.width; H = r.height;
      half = grip.offsetWidth / 2 || 26;
      lblY = lblB ? lblB.offsetTop + lblB.offsetHeight / 2 : 0;
      wB = lblB ? lblB.offsetWidth + lblB.offsetLeft : 0;
      wA = lblA ? W - lblA.offsetLeft : 0;
      if (slant && line && H) {
        line.style.transform = 'rotate(' + (Math.atan2(2 * slant / 100 * W, H) * 180 / Math.PI) + 'deg)';
      }
      paint();
    }

    function set(next, glide) {
      next = Math.round(clamp(next, 0, 100) * 100) / 100;
      clearTimeout(glideTimer);
      if (glide && !reduce) {
        root.classList.add('is-glide');
        glideTimer = setTimeout(function () { root.classList.remove('is-glide'); }, JUMP_MS + 30);
      } else {
        root.classList.remove('is-glide');
      }
      if (next === val) return;
      val = next;
      if (glide || document.hidden) { if (raf) { cancelAnimationFrame(raf); } paint(); }
      else if (!raf) raf = requestAnimationFrame(paint);
    }

    /* Зона у края: u — где палец (в % ширины, уже с поправкой на наклон), lo — где шторка должна закрыться.
       От lo до z линия плавно обгоняет палец и приходит в −slant; дальше z идёт ровно под пальцем. */
    function ease(u, lo, z) {
      if (u >= z) return u;
      var t = clamp((u - lo) / (z - lo), 0, 1), k = (z - lo) / (z + slant);
      return (z + slant) * ((k - 1) * t * t + (2 - k) * t) - slant;
    }

    function fromEvent(e) {
      var r = root.getBoundingClientRect();
      var q = slant * (1 - 2 * (e.clientY - r.top) / r.height);            /* сдвиг наклонной линии на высоте пальца */
      var u = (e.clientX - r.left) / r.width * 100 - q;                    /* линия остаётся под пальцем */
      var e0 = half / r.width * 100, z = 30 + slant;                      /* закрыто, когда захват упёрся в край */
      var c = u < 50 ? ease(u, e0 - q, z) : 100 - ease(100 - u, e0 + q, z);
      return (c + slant) / span * 100;
    }

    root.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      var touch = e.pointerType === 'touch';
      drag = { id: e.pointerId, x0: e.clientX, active: !touch, moved: false };
      root.classList.add('is-press');
      if (!touch) {
        try { root.setPointerCapture(e.pointerId); } catch (err) {}
        set(fromEvent(e), true);
        e.preventDefault();
      }
    });
    root.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.active) {
        if (Math.abs(e.clientX - drag.x0) < TOUCH_SLOP) return;
        drag.active = true;
        try { root.setPointerCapture(e.pointerId); } catch (err) {}
      }
      drag.moved = true;
      root.classList.add('is-drag');
      set(fromEvent(e), false);
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (e.type === 'pointerup' && !drag.moved && !drag.active) set(fromEvent(e), true); /* короткий тап */
      if (val > 0 && val < SNAP) set(0, true);                             /* не оставлять полоску у края */
      else if (val < 100 && val > 100 - SNAP) set(100, true);
      drag = null;
      root.classList.remove('is-press');
      root.classList.remove('is-drag');
      root.classList.add('is-touched');
    }
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);

    grip.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 1, next = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = val - step;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = val + step;
      else if (e.key === 'PageDown') next = val - 10;
      else if (e.key === 'PageUp') next = val + 10;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = 100;
      if (next === null) return;
      e.preventDefault();
      set(next, false);
      root.classList.add('is-touched');
    });
    grip.addEventListener('click', function (e) { e.preventDefault(); });

    Array.prototype.forEach.call(root.querySelectorAll('img'), function (img) {
      function ok() { img.classList.add('is-loaded'); }
      if (img.complete && img.naturalWidth > 0) ok(); else img.addEventListener('load', ok);
    });

    if (window.ResizeObserver) new ResizeObserver(measure).observe(root);
    else window.addEventListener('resize', measure);
    measure();
  }

  function boot() { Array.prototype.forEach.call(document.querySelectorAll('.cmp'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
