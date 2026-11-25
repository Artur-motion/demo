/* Режим зала (cafe_page-v3.py): ленты фото залов и блок «Свободна ли дата?». Первый экран ведёт car.js, как у ресторанов. */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* Ленты фото. Телефон: листает сам браузер (scroll-snap), мы только двигаем точки.
     Компьютер: ленту тянут мышью или листают стрелками; стрелки видны, только когда есть куда листать. */
  $('[data-shots]').forEach(function (box) {
    var rail = box.querySelector('.rail'), shots = $('.shot', rail), pips = $('.pips i', box);
    var prev = box.querySelector('.arr.prev'), next = box.querySelector('.arr.next'), tick = 0;
    function upd() {
      tick = 0;
      var max = rail.scrollWidth - rail.clientWidth, x = rail.scrollLeft;
      if (pips.length) {
        var i = Math.round(x / (shots[0].offsetWidth || 1));
        pips.forEach(function (p, k) { p.classList.toggle('on', k === i); });
      }
      if (prev) { prev.disabled = x < 4; next.disabled = x > max - 4; box.classList.toggle('scrolls', max > 8); }
    }
    rail.addEventListener('scroll', function () { if (!tick) tick = requestAnimationFrame(upd); }, { passive: true });
    window.addEventListener('resize', upd);
    window.addEventListener('load', upd);
    upd();
    function step(dir) { rail.scrollBy({ left: dir * (box.classList.contains('strip') ? Math.max(280, rail.clientWidth * 0.62) : rail.clientWidth), behavior: reduce ? 'auto' : 'smooth' }); }
    if (prev) {
      prev.addEventListener('click', function () { step(-1); });
      next.addEventListener('click', function () { step(1); });
    }
    var down = false, moved = false, x0 = 0, s0 = 0, dragAt = 0;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; x0 = e.clientX; s0 = rail.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - x0;
      if (!moved && Math.abs(dx) < 6) return;
      moved = true; rail.classList.add('drag'); rail.scrollLeft = s0 - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false; rail.classList.remove('drag');
      if (moved) dragAt = Date.now();
    });
    rail.addEventListener('click', function (e) { if (Date.now() - dragAt < 350) { e.preventDefault(); e.stopPropagation(); } }, true);
    rail.addEventListener('dragstart', function (e) { e.preventDefault(); });
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });

    /* фото зала чуть «усаживается» на место, когда до него долистали (один раз, без исчезновений) */
    if (!reduce && 'IntersectionObserver' in window) {
      box.classList.add('live');
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { box.classList.add('seen'); io.disconnect(); }
      }, { threshold: 0.18 });
      io.observe(box);
    }
  });

  /* «Свободна ли дата?»: дата и число гостей складываются в готовое сообщение, кнопка открывает WhatsApp с ним */
  var go = d.getElementById('askGo');
  if (go) {
    var D = d.getElementById('askDate'), N = d.getElementById('askN'), say = d.getElementById('askSay');
    var wa = go.getAttribute('data-wa'), t0 = go.getAttribute('data-text');
    var MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var DOW = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    var now = new Date();
    var two = function (n) { return (n < 10 ? '0' : '') + n; };
    D.min = now.getFullYear() + '-' + two(now.getMonth() + 1) + '-' + two(now.getDate());
    var ppl = function (n) { var a = n % 10, b = n % 100; return (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 'человека' : 'человек'; };
    var make = function () {
      var t = t0, p = /^(\d{4})-(\d\d)-(\d\d)$/.exec(D.value || ''), n = parseInt(N.value, 10);
      if (p) {
        var dt = new Date(+p[1], +p[2] - 1, +p[3]);
        t = 'Здравствуйте! Свободна ли у вас дата ' + dt.getDate() + ' ' + MON[dt.getMonth()] +
            (dt.getFullYear() !== now.getFullYear() ? ' ' + dt.getFullYear() + ' года' : '') + ' (' + DOW[dt.getDay()] + ')?';
      }
      if (n > 0 && n < 10000) t += ' Нас будет ' + n + ' ' + ppl(n) + '.';
      say.textContent = t;
      go.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(t);
    };
    D.addEventListener('input', make); D.addEventListener('change', make);
    N.addEventListener('input', make);
    make();
  }
})();
