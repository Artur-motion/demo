// Шаблон «банкетный зал», вариант Б (23.11.2026). Основа — vhnzzk/script.js (его не трогаем).
// Первый экран: фото зала «живое» (камера медленно идёт по залу), при прокрутке окно раскрывается на весь экран,
// короткий вдох — и уходит вместе с пальцем. Без GSAP или при «уменьшить движение» — обычная колонка со статичными фото.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Полоса «Позвонить / WhatsApp» на телефоне ---------- */
  // Видна после первого экрана; в блоке контактов прячется: там свои кнопки.
  (function callbar() {
    var bar = document.querySelector('.callbar');
    var heroSec = document.querySelector('.cine');
    var contacts = document.getElementById('kontakty');
    if (!bar || !heroSec || !('IntersectionObserver' in window)) return;
    var foot = document.querySelector('.foot');
    var heroSeen = true, contactsSeen = false, footSeen = false;
    function update() { bar.classList.toggle('on', !heroSeen && !contactsSeen && !footSeen); }
    new IntersectionObserver(function (e) { heroSeen = e[0].isIntersecting; update(); }).observe(heroSec);
    if (contacts) new IntersectionObserver(function (e) { contactsSeen = e[0].isIntersecting; update(); }).observe(contacts);
    if (foot) new IntersectionObserver(function (e) { footSeen = e[0].isIntersecting; update(); }).observe(foot); // в подвале телефон крупно — полоса не нужна
  })();

  /* ---------- «Свободна ли ваша дата?»: выбранный день попадает в готовый вопрос для WhatsApp ---------- */
  // Формы нет и данные никуда не отправляются: кнопка — обычная ссылка wa.me с текстом. Без скрипта ссылка тоже работает (общий вопрос).
  (function ask() {
    var box = document.querySelector('.ask');
    if (!box) return;
    var input = box.querySelector('input[type="date"]');
    var out = box.querySelector('.ask-val');
    var go = box.querySelector('.ask-go');
    if (!input || !go) return;
    box.classList.add('ask-on');
    var MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var DAY = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    var now = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    input.min = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    var empty = out ? out.textContent : '';
    function update() {
      var p = input.value ? input.value.split('-') : null;
      var text = box.getAttribute('data-text');
      if (p) {
        var d = new Date(+p[0], p[1] - 1, +p[2]);
        var date = d.getDate() + ' ' + MON[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() + ' года' : '');
        text = box.getAttribute('data-text-date').replace('{date}', date);
        if (out) out.textContent = date + ', ' + DAY[d.getDay()];
      } else if (out) out.textContent = empty;
      box.classList.toggle('has-date', !!p);
      go.href = 'https://wa.me/' + box.getAttribute('data-wa') + '?text=' + encodeURIComponent(text);
    }
    input.addEventListener('change', update);
    input.addEventListener('input', update);
    // На компьютере календарь открывается по нажатию в любом месте поля, а не только по маленькому значку
    input.addEventListener('click', function () { if (input.showPicker) { try { input.showPicker(); } catch (e) {} } });
    update();
  })();

  // no-motion уже стоит, если анимация не успела за 3 с (запасной показ в <head>): страница остаётся обычной,
  // иначе готовая страница на глазах перестроилась бы в первый экран с анимацией.
  if (reduce || !window.gsap || !window.ScrollTrigger || root.classList.contains('no-motion')) {
    root.classList.add('no-motion');
    return;
  }

  // Фото ниже первого экрана расшифровываются в фоне: кадр прокрутки их не ждёт (меньше рывков на слабом телефоне)
  [].forEach.call(document.querySelectorAll('img:not(.cine-photo)'), function (img) { img.decoding = 'async'; });

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var mq = window.matchMedia('(max-width: 760px)');
  var mobile = mq.matches;
  // Размеры первого экрана считаются при загрузке. Если окно переключили между «телефоном» и «компьютером»
  // (поворот планшета, режим телефона в браузере), перезагружаем страницу, иначе расчёты остаются от старого размера.
  function onModeChange() { window.scrollTo(0, 0); location.reload(); }
  if (mq.addEventListener) mq.addEventListener('change', onModeChange); else if (mq.addListener) mq.addListener(onModeChange);

  /* ---------- Первый экран ---------- */
  function hero() {
    var sec = document.querySelector('.cine');
    if (!sec) return;
    // Закрепление делает сам браузер (position: sticky в обёртке нужной высоты), а не скрипт: на телефоне прокрутка идёт
    // без ожидания скрипта, и переключение fixed ↔ обычное положение давало рывки.
    // Шкала прокрутки в «единицах» — как в vhnzzk: въезд и раскрытие фото, короткая пауза (HOLD), ровный уход (EXIT).
    var unitPx = (mobile ? 1600 : 2200) / 4.9;
    // Подписи поверх фото может не быть (светлый зал: белый текст на белой стене не читается без тяжёлой тени — фото остаётся чистым).
    // Тогда фото раскрывается раньше, а «вдох» чуть длиннее: весь первый экран короче (1094 px на телефоне вместо 1143).
    var hasText = !!sec.querySelector('.cine-card-text');
    var OPEN = hasText ? 2.1 : 1.8;   // фото раскрыто (и подпись проявилась, если она есть)
    var HOLD = hasText ? 0.1 : 0.25;  // «вдох» на весь экран (≈ 80–90 px на телефоне)
    var EXIT = 1.3;   // уход фото: с постоянной скоростью, вместе с пальцем
    var exitAt = OPEN + HOLD;
    // 1143 / 1571 px с подписью, 1094 / 1504 без неё (телефон / компьютер) — столько же ставит hall_page.py в --pin-m / --pin-d
    var scrollLen = Math.round(unitPx * (exitAt + EXIT));
    var pinWrap = document.createElement('div');
    pinWrap.className = 'cine-pin';
    pinWrap.style.setProperty('--pin-len', scrollLen + 'px');
    sec.parentNode.insertBefore(pinWrap, sec);
    pinWrap.appendChild(sec);
    root.classList.add('cine-live');

    var title = sec.querySelector('.cine-title');
    var lines = sec.querySelectorAll('.l-in');
    var sub = sec.querySelector('.cine-sub');
    var btns = sec.querySelector('.hero-actions');
    var card = sec.querySelector('.cine-card');
    var zoom = sec.querySelector('.cine-zoom');
    var img = sec.querySelector('.cine-photo');
    var text = sec.querySelector('.cine-card-text');
    var brand = sec.querySelector('.cine-card-brand');
    var cta = sec.querySelector('.cine-cta');
    var shade = sec.querySelector('.cine-shade');
    var h1 = sec.querySelector('h1');
    var eyebrow = sec.querySelector('.cine-eyebrow');
    var head = eyebrow || h1; // верхняя строка блока заголовка

    var hFrac = mobile ? 0.92 : 0.85;
    var cardW = mobile ? '92vw' : '85vw';
    var radius = mobile ? 28 : 36;

    // Высота экрана — по самой секции (100svh): она не меняется, когда на телефоне прячется адресная строка.
    function H() { return sec.offsetHeight; }
    var secTop = pinWrap.getBoundingClientRect().top + window.pageYOffset; // шапка над первым экраном
    var contentH = 0;
    // по местам в вёрстке (offsetTop), а не по видимым прямоугольникам: на появлении кнопки сдвинуты анимацией, и замер «плавал» на 18 px
    function measure() { if (head && btns) contentH = btns.offsetTop + btns.offsetHeight - head.offsetTop; }
    measure();
    // «Окно» с фото видно уже в первом экране. На телефоне оно начинается сразу под кнопками, но не меньше 30 % экрана.
    function peek() {
      var base = Math.round(H() * (mobile ? 0.3 : 0.24));
      if (!contentH) return base;
      return Math.max(base, Math.round(H() - secTop - contentH - (mobile ? 56 : 150)));
    }
    function startY() { return H() * (0.5 + hFrac / 2) - secTop - peek(); }
    function place() { title.style.paddingBottom = (secTop + peek()) + 'px'; } // заголовок — по центру места над фото

    // Что показывает «окно», пока карточка внизу: не потолок (верх кадра), а полосу вокруг главного места фото (data-fy, доля высоты).
    // Фото внутри карточки сдвинуто вверх и возвращается на место, пока карточка поднимается: получается «окно в зал» —
    // рамка идёт быстрее, зал за ней медленнее. Сдвиг никогда не больше запаса под экраном, поэтому пустой полосы снизу не бывает.
    var fy = parseFloat(img.getAttribute('data-fy')) || 0.6;
    var S0 = 0, Y0 = 1, M = 0;
    function calcShift() {
      var ch = H() * hFrac, pk = peek();
      Y0 = startY();
      M = (H() - ch) / 2 + 2;
      S0 = Math.max(0, Math.min(fy * ch - pk / 2, Y0 - M, ch - pk));
    }
    function syncShift() {
      var y = gsap.getProperty(card, 'y');
      var k = Y0 > M ? (y - M) / (Y0 - M) : 0;
      gsap.set(zoom, { y: -S0 * Math.max(0, Math.min(1, k)) });
    }

    // Проезд камеры: если фото заметно шире окна (телефон), оно ставится по высоте и медленно едет вдоль зала;
    // иначе (компьютер) — медленный наезд. Пропорции окна на всём пути одни и те же, поэтому края считаем один раз.
    function setPan() {
      var iw = +img.getAttribute('width'), ih = +img.getAttribute('height');
      var ai = iw && ih ? iw / ih : 0, ac = window.innerWidth / H();
      if (!ai || ai < ac * 1.15) { root.classList.remove('cine-pan'); return; }
      var k = (1 - ac / ai) * 100 * 0.98; // сколько % ширины фото не помещается в окно (2 % запаса от пустого края)
      var ends = (img.getAttribute('data-pan') || '0,100').split(',');
      var a = +ends[0] || 0, b = isNaN(+ends[1]) ? 100 : +ends[1];
      var px = H() * hFrac * ai * k / 100 * Math.abs(b - a) / 100;    // путь в пикселях
      img.style.setProperty('--pan-a', (-k * a / 100).toFixed(3) + '%');
      img.style.setProperty('--pan-b', (-k * b / 100).toFixed(3) + '%');
      img.style.setProperty('--pan-time', Math.max(16, Math.min(40, px / 20)).toFixed(1) + 's'); // в среднем ~20 px в секунду: спокойно, но заметно
      root.classList.add('cine-pan');
    }

    calcShift();
    setPan();
    gsap.set(card, { xPercent: -50, yPercent: -50, width: cardW, height: function () { return H() * hFrac; }, borderRadius: radius, y: startY });
    place();
    syncShift();
    ScrollTrigger.addEventListener('refreshInit', function () {
      if (window.pageYOffset === 0) { secTop = pinWrap.getBoundingClientRect().top; measure(); }
      place();
      calcShift();
      setPan();
    });
    ScrollTrigger.addEventListener('refresh', syncShift);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (window.pageYOffset === 0) ScrollTrigger.refresh(); });

    if (shade) gsap.set(shade, { opacity: 0 });                  // затемнение нужно только под текстом
    if (text) gsap.set(text, { y: 28, autoAlpha: 0 });
    if (brand) gsap.set(brand, { autoAlpha: 0 });
    gsap.set(cta, { autoAlpha: 0, y: 36 });

    // Появление — один раз, одной связкой (характер «премиум»: без пружин, длинное мягкое торможение).
    // Первым идёт главное — фото зала: рамка поднимается, зал внутри «отъезжает» в резкость места. Потом строки названия
    // выезжают из-под кромки, последними — подпись и кнопки. Ничего не мигает: прозрачность только растёт.
    var intro = gsap.timeline();
    intro.fromTo(card, { yPercent: -43, autoAlpha: 0 }, { yPercent: -50, autoAlpha: 1, duration: 1.3, ease: 'expo.out' }, 0)
      .fromTo(zoom, { scale: 1.16 }, { scale: 1, duration: 2.4, ease: 'expo.out' }, 0)
      .fromTo(lines, { yPercent: 112, y: 0 }, { yPercent: 0, y: 0, duration: 1.1, ease: 'power4.out', stagger: 0.13 }, 0.12);
    var late = [eyebrow, sub, btns].filter(Boolean);
    if (late.length) intro.fromTo(late, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out', stagger: 0.1 }, 0.5);

    // Прокрутка: заголовок уходит, фото въезжает и раскрывается на весь экран, короткая пауза — и фото уходит вверх
    var tl = gsap.timeline({
      onUpdate: syncShift,
      scrollTrigger: {
        trigger: pinWrap,
        start: 'top top',
        end: '+=' + scrollLen,
        scrub: 0.4,
        invalidateOnRefresh: true
      }
    });
    tl.to(title, { yPercent: -6, scale: 1.06, autoAlpha: 0, duration: 0.5, ease: 'none' }, 0)
      .fromTo(card, { y: startY }, { y: 0, duration: 1, ease: 'power2.out' }, 0) // старт пересчитывается при смене размера окна
      .to(card, { width: '100vw', height: function () { return H(); }, borderRadius: 0, duration: 1, ease: 'power2.inOut' }, 0.8);
    if (text) tl.to(text, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' }, 1.5);
    if (shade && text) tl.to(shade, { opacity: 1, duration: 0.7, ease: 'none' }, 0.9);
    if (brand) tl.to(brand, { autoAlpha: 1, duration: 0.6 }, 1.6);
    // Уход: фото уезжает вверх целиком, как перелистнутая страница. Скорость постоянная (ease: 'none') — без разгона и сжатия.
    tl.to(card, { y: function () { return -H() * 1.1; }, duration: EXIT, ease: 'none' }, exitAt);
    // Блок «Свободна ли ваша дата?» проявляется под уходящим фото
    tl.to(cta, { autoAlpha: 1, y: 0, duration: EXIT - 0.45, ease: 'power2.out' }, exitAt + 0.3);
  }

  /* ---------- Лента фото: медленно едет сама, пальцем или мышью листается как обычно ---------- */
  function film() {
    var lane = document.querySelector('.film');
    if (!lane) return;
    var toggle = document.querySelector('.motion-toggle');
    var paused = false;
    var group = lane.firstElementChild;
    for (var i = 0; i < 2; i++) {
      var copy = group.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('img').forEach(function (img) { img.alt = ''; });
      lane.appendChild(copy);
    }
    var t = { period: 0, position: 0, rendered: 0, resumeAt: 0 };

    function measure() {
      var period = group.offsetWidth;
      if (period === t.period) return;
      t.position = t.period ? t.position / t.period * period : 0;
      t.period = period;
      lane.scrollLeft = t.position;
      t.rendered = lane.scrollLeft;
    }
    function tick(time, elapsed) {
      if (document.hidden || paused) return;
      if (lane.scrollLeft !== t.rendered) { // человек сам листает ряд — подождать
        t.position = lane.scrollLeft;
        t.rendered = lane.scrollLeft;
        t.resumeAt = time + 1.2;
      }
      if (time < t.resumeAt || !t.period) return;
      t.position = gsap.utils.wrap(0, t.period, t.position + Math.min(elapsed, 48) * 0.026);
      lane.scrollLeft = t.position;
      t.rendered = lane.scrollLeft;
    }

    measure();
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(group);
    // Фото ленты начинают грузиться, когда она близко (до этого — не мешают первому экрану); едет лента, только пока видна
    new IntersectionObserver(function (entries, io) {
      if (!entries[0].isIntersecting) return;
      lane.querySelectorAll('img').forEach(function (img) { img.loading = 'eager'; });
      io.disconnect();
    }, { rootMargin: '900px 0px' }).observe(lane);
    new IntersectionObserver(function (entries) {
      gsap.ticker.remove(tick);
      if (entries[0].isIntersecting) gsap.ticker.add(tick);
    }).observe(lane);

    if (toggle) {
      toggle.addEventListener('click', function () {
        paused = !paused;
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.textContent = paused ? 'Продолжить' : 'Пауза';
      });
    }
  }

  /* ---------- Запуск: первый экран появляется один раз и сразу в готовом виде ---------- */
  // До запуска первый экран скрыт (style.css). Ждём его шрифты: с запасным шрифтом заголовок занимает больше строк,
  // и после подмены шрифта подпись, кнопки и фото прыгали бы. Ждём и первое фото. Не дольше ~2,4 с от начала загрузки:
  // в 3 с срабатывает запасной показ без анимации.
  function heroFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var jobs = [];
    [].forEach.call(document.querySelectorAll('.brand-name, .cine-eyebrow, .cine .l1, .cine-sub, .hero-actions .btn'), function (el) {
      var cs = window.getComputedStyle(el);
      jobs.push(document.fonts.load(cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily, el.textContent));
    });
    var img = document.querySelector('.cine-photo');
    if (img && img.decode) jobs.push(img.decode().catch(function () {}));
    return Promise.all(jobs);
  }
  var started = false;
  function start() {
    if (started) return;
    started = true;
    if (root.classList.contains('no-motion')) return; // запасной показ уже сработал
    hero();
    film();
  }
  heroFonts().then(start, start);
  setTimeout(start, Math.max(0, 2400 - performance.now()));
})();
