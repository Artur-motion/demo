// Первый экран по механике «Cinematic landing Hero» и ряды фото по механике Daytake.
// Без GSAP или при «уменьшить движение» страница остаётся обычной колонкой со статичными фото.
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
    var heroSeen = true, contactsSeen = false;
    function update() { bar.classList.toggle('on', !heroSeen && !contactsSeen); }
    new IntersectionObserver(function (e) { heroSeen = e[0].isIntersecting; update(); }).observe(heroSec);
    if (contacts) new IntersectionObserver(function (e) { contactsSeen = e[0].isIntersecting; update(); }).observe(contacts);
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
    // Закрепление первого экрана делает сам браузер (position: sticky в обёртке нужной высоты), а не скрипт.
    // Раньше скрипт переключал секцию между fixed и обычным положением: на телефоне прокрутка идёт без ожидания скрипта,
    // и в момент, когда закрепление снималось, фото уезжало наверх рывками.
    // Шкала прокрутки в «единицах»: 1 единица = столько же px, сколько раньше (1600 / 4.9 на телефоне, 2200 / 4.9 на компьютере),
    // поэтому въезд и раскрытие фото идут с прежней скоростью. Короче стал только хвост: фото встало на весь экран,
    // короткая пауза (HOLD) — и оно ровно уходит вверх (EXIT), без сжатия в карточку и без разгона.
    var unitPx = (mobile ? 1600 : 2200) / 4.9;
    var OPEN = 2.1;   // фото раскрыто, подпись проявилась (как раньше)
    var HOLD = 0.1;   // «вдох» на весь экран: подпись видна целиком уже к ~1.95, так что пауза выходит ~0.25 (≈ 90 px на телефоне); раньше простой был 0.9
    var EXIT = 1.3;   // уход фото: на телефоне ~425 px прокрутки, фото идёт примерно вдвое быстрее пальца, с постоянной скоростью
    var exitAt = OPEN + HOLD;
    var scrollLen = Math.round(unitPx * (exitAt + EXIT)); // 1143 px на телефоне, 1571 на компьютере — столько же в style.css (margin-bottom)
    var pinWrap = document.createElement('div');
    pinWrap.className = 'cine-pin';
    pinWrap.style.setProperty('--pin-len', scrollLen + 'px');
    sec.parentNode.insertBefore(pinWrap, sec);
    pinWrap.appendChild(sec);
    root.classList.add('cine-live');

    var title = sec.querySelector('.cine-title');
    var l1 = sec.querySelector('.l1');
    var l2 = sec.querySelector('.l2');
    var card = sec.querySelector('.cine-card');
    var text = sec.querySelector('.cine-card-text');
    var brand = sec.querySelector('.cine-card-brand');
    var cta = sec.querySelector('.cine-cta');
    var shade = sec.querySelector('.cine-shade');

    var cardW = mobile ? '92vw' : '85vw';
    var cardH = mobile ? '92vh' : '85vh';
    var hFrac = mobile ? 0.92 : 0.85;
    var radius = mobile ? 32 : 40;
    var blur = !mobile;                // на телефоне без размытия: легче для слабых телефонов
    var light = !!document.querySelector('link[href*="light.css"]'); // светлая тема: след заголовка на светлом фоне виден — гасим полностью

    // Верх фото зала виден уже в первом экране («окно» внизу): в образце карточка ждёт под экраном,
    // но тогда первый экран без фото. Дальше механика та же: карточка въезжает и раскрывается.
    var secTop = pinWrap.getBoundingClientRect().top + window.pageYOffset; // шапка над первым экраном (по обёртке: она не закрепляется)
    // На телефоне фото начинается сразу под кнопками (без пустых полос), но не меньше 30 % высоты экрана.
    var h1 = sec.querySelector('h1'), btns = sec.querySelector('.hero-actions'), contentH = 0;
    function measure() { if (h1 && btns) contentH = btns.getBoundingClientRect().bottom - h1.getBoundingClientRect().top; }
    measure();
    function peek() {
      var base = Math.round(window.innerHeight * (mobile ? 0.3 : 0.24));
      if (!mobile || !contentH) return base;
      return Math.max(base, Math.round(window.innerHeight - secTop - contentH - 24 - 32));
    }
    function startY() { return window.innerHeight * (0.5 + hFrac / 2) - secTop - peek(); }
    function place() { title.style.paddingBottom = (secTop + peek()) + 'px'; } // заголовок — по центру места над фото

    gsap.set(card, { xPercent: -50, yPercent: -50, width: cardW, height: cardH, borderRadius: radius, y: startY });
    place();
    // Шрифты догружаются позже — пересчитать высоту заголовка и место фото
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (window.pageYOffset === 0) ScrollTrigger.refresh(); });
    ScrollTrigger.addEventListener('refreshInit', function () {
      if (window.pageYOffset === 0) { secTop = pinWrap.getBoundingClientRect().top; measure(); }
      place();
    });
    if (shade) gsap.set(shade, { opacity: 0 });                  // затемнение нужно только под текстом
    gsap.set(text, { x: -50, autoAlpha: 0 });
    if (brand) gsap.set(brand, { autoAlpha: 0 });
    gsap.set(cta, { autoAlpha: 0, scale: 0.8, filter: blur ? 'blur(30px)' : 'none' });

    // Появление заголовка: первая строка из размытия, вторая «проявляется» слева направо
    var intro = gsap.timeline();
    intro.fromTo(l1,
      { opacity: 0, y: 60, scale: 0.85, filter: blur ? 'blur(20px)' : 'none' },
      { opacity: 1, y: 0, scale: 1, filter: blur ? 'blur(0px)' : 'none', duration: 1.8, ease: 'expo.out' }, 0)
      .fromTo(l2, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.4, ease: 'power4.inOut' }, 0.3);

    // Прокрутка: заголовок уходит, фото въезжает и раскрывается на весь экран, короткая пауза — и фото уходит вверх
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: pinWrap,
        start: 'top top',
        end: '+=' + scrollLen,
        scrub: 0.4, // было 1: фото «доплывало» ещё секунду после остановки пальца
        invalidateOnRefresh: true
      }
    });
    tl.to(title, { scale: 1.15, opacity: light ? 0 : 0.2, filter: blur ? 'blur(20px)' : 'none', duration: 1, ease: 'none' }, 0)
      .fromTo(card, { y: startY }, { y: 0, duration: 1, ease: 'power2.out' }, 0) // старт пересчитывается при смене размера окна
      .to(card, { width: '100vw', height: '100vh', borderRadius: 0, duration: 1, ease: 'power2.inOut' }, 0.8)
      .to(text, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' }, 1.5);
    if (shade) tl.to(shade, { opacity: 1, duration: 0.7, ease: 'none' }, 0.9);
    // Кнопки первого экрана уходят совсем: размытое золотое пятно просвечивало бы под блоком «Свободна ли ваша дата?»
    var heroBtns = sec.querySelector('.hero-actions');
    if (heroBtns) tl.to(heroBtns, { autoAlpha: 0, duration: 0.6, ease: 'none' }, 0);
    if (brand) tl.to(brand, { autoAlpha: 1, duration: 0.6 }, 1.6);
    // Уход: фото уезжает вверх целиком, как перелистнутая страница. Скорость постоянная (ease: 'none') — раньше был разгон
    // (power2.in), а перед ним ещё сжатие в карточку: из-за них фото то медлило, то улетало.
    tl.to(card, { y: function () { return -window.innerHeight * 1.1; }, duration: EXIT, ease: 'none' }, exitAt);
    // На телефоне заголовок не размывается, поэтому прячем его, пока он закрыт фото: иначе просвечивал бы под кнопками
    if (!blur && !light) tl.to(title, { autoAlpha: 0, duration: 0.4 }, 1.8);
    // Блок «Свободна ли ваша дата?» проявляется под уходящим фото: как раньше, через 0.3 после начала ухода
    tl.to(cta, { autoAlpha: 1, scale: 1, filter: blur ? 'blur(0px)' : 'none', duration: EXIT - 0.3, ease: 'power2.out' }, exitAt + 0.3);
  }

  /* ---------- Ряды фото навстречу друг другу ---------- */
  function gallery() {
    var strip = document.querySelector('.gallery');
    if (!strip) return;
    var toggle = document.querySelector('.motion-toggle');
    var paused = false;

    var tracks = [].slice.call(strip.querySelectorAll('.lane')).map(function (lane, index) {
      var group = lane.firstElementChild;
      for (var i = 0; i < 2; i++) {
        var copy = group.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copy.querySelectorAll('img').forEach(function (img) { img.alt = ''; });
        lane.appendChild(copy);
      }
      return { lane: lane, group: group, direction: index === 0 ? 1 : -1, period: 0, position: 0, rendered: 0, resumeAt: 0 };
    });

    function measure() {
      tracks.forEach(function (t) {
        var period = t.group.offsetWidth;
        if (period === t.period) return;
        t.position = t.period ? t.position / t.period * period : (t.direction === 1 ? 0 : period);
        t.period = period;
        t.lane.scrollLeft = t.position;
        t.rendered = t.lane.scrollLeft;
      });
    }

    function tick(time, elapsed) {
      if (document.hidden || paused) return;
      for (var i = 0; i < tracks.length; i++) {
        var t = tracks[i];
        if (t.lane.scrollLeft !== t.rendered) { // человек сам листает ряд — подождать
          t.position = t.lane.scrollLeft;
          t.rendered = t.lane.scrollLeft;
          t.resumeAt = time + 0.8;
        }
        if (time < t.resumeAt || !t.period) continue;
        t.position = gsap.utils.wrap(0, t.period, t.position + t.direction * Math.min(elapsed, 48) * 0.032);
        t.lane.scrollLeft = t.position;
        t.rendered = t.lane.scrollLeft;
      }
    }

    measure();
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(measure);
      tracks.forEach(function (t) { ro.observe(t.group); });
    }
    new IntersectionObserver(function (entries) {
      gsap.ticker.remove(tick);
      if (entries[0].isIntersecting) gsap.ticker.add(tick);
    }).observe(strip);

    if (toggle) {
      toggle.addEventListener('click', function () {
        paused = !paused;
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.textContent = paused ? 'Продолжить' : 'Пауза';
      });
    }

    // Фото «приезжают» справа, пока ряд входит в экран
    var arrival = gsap.timeline({
      scrollTrigger: { trigger: strip, start: 'top 92%', end: 'top 50%', scrub: 0.45, invalidateOnRefresh: true }
    });
    strip.querySelectorAll('.lane-group').forEach(function (group) {
      arrival.fromTo(group.querySelectorAll('.ph'),
        { x: function () { return Math.min(window.innerWidth, 1300) * 0.83; }, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.65, stagger: 0.09 }, 0);
    });
  }

  /* ---------- Запуск: первый экран появляется один раз и сразу в готовом виде ---------- */
  // До запуска первый экран скрыт (style.css). Ждём его шрифты: с запасным шрифтом заголовок занимает больше строк,
  // и после подмены шрифта подзаголовок, кнопки и фото прыгали вверх. Ждём не дольше ~2,4 с от начала загрузки:
  // в 3 с срабатывает запасной показ без анимации.
  function heroFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var jobs = [];
    [].forEach.call(document.querySelectorAll('.cine h1, .cine-sub, .hero-actions .btn'), function (el) {
      var cs = window.getComputedStyle(el);
      jobs.push(document.fonts.load(cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily, el.textContent));
    });
    return Promise.all(jobs);
  }
  var started = false;
  function start() {
    if (started) return;
    started = true;
    if (root.classList.contains('no-motion')) return; // запасной показ уже сработал
    hero();
    gallery();
  }
  heroFonts().then(start, start);
  setTimeout(start, Math.max(0, 2400 - performance.now()));
})();
