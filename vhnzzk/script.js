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

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    root.classList.add('no-motion');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var mq = window.matchMedia('(max-width: 760px)');
  var mobile = mq.matches;
  // Размеры первого экрана считаются при загрузке. Если окно переключили между «телефоном» и «компьютером»
  // (поворот планшета, режим телефона в браузере), перезагружаем страницу, иначе расчёты остаются от старого размера.
  function onModeChange() { window.scrollTo(0, 0); location.reload(); }
  if (mq.addEventListener) mq.addEventListener('change', onModeChange); else if (mq.addListener) mq.addListener(onModeChange);

  /* ---------- Первый экран ---------- */
  (function hero() {
    var sec = document.querySelector('.cine');
    if (!sec) return;
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

    // Верх фото зала виден уже в первом экране («окно» внизу): в образце карточка ждёт под экраном,
    // но тогда первый экран без фото. Дальше механика та же: карточка въезжает и раскрывается.
    var secTop = sec.getBoundingClientRect().top + window.pageYOffset; // шапка и плашка над первым экраном
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
      if (window.pageYOffset === 0) { secTop = sec.getBoundingClientRect().top; measure(); }
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

    // Прокрутка: заголовок уходит, фото въезжает и раскрывается на весь экран, потом сжимается и уходит
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: sec,
        start: 'top top',
        end: '+=' + (mobile ? 1600 : 2200),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
    tl.to(title, { scale: 1.15, opacity: 0.2, filter: blur ? 'blur(20px)' : 'none', duration: 1, ease: 'none' }, 0)
      .fromTo(card, { y: startY }, { y: 0, duration: 1, ease: 'power2.out' }, 0) // старт пересчитывается при смене размера окна
      .to(card, { width: '100vw', height: '100vh', borderRadius: 0, duration: 1, ease: 'power2.inOut' }, 0.8)
      .to(text, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' }, 1.5);
    if (shade) tl.to(shade, { opacity: 1, duration: 0.7, ease: 'none' }, 0.9);
    // Кнопки первого экрана уходят совсем: размытое золотое пятно просвечивало бы под блоком «Свободна ли ваша дата?»
    var heroBtns = sec.querySelector('.hero-actions');
    if (heroBtns) tl.to(heroBtns, { autoAlpha: 0, duration: 0.6, ease: 'none' }, 0);
    if (brand) tl.to(brand, { autoAlpha: 1, duration: 0.6 }, 1.6);
    tl.to(card, { width: cardW, height: cardH, borderRadius: radius, duration: 0.8, ease: 'power2.inOut' }, 3.0)
      .to(card, { y: function () { return -window.innerHeight * 1.1; }, duration: 1, ease: 'power2.in' }, 3.6);
    // На телефоне заголовок не размывается, поэтому прячем его, чтобы он не просвечивал под кнопками
    if (!blur) tl.to(title, { autoAlpha: 0, duration: 0.4 }, 3.6);
    tl.to(cta, { autoAlpha: 1, scale: 1, filter: blur ? 'blur(0px)' : 'none', duration: 1, ease: 'power2.out' }, 3.9);
  })();

  /* ---------- Ряды фото навстречу друг другу ---------- */
  (function gallery() {
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
  })();
})();
