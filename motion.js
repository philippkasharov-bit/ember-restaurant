// EMBER editorial: Lenis + GSAP ScrollTrigger по официальному рецепту.
// Базовое состояние страницы видимое — анимации только добавляются поверх.
addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.hd');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dock = document.querySelector('.dock');
  const reserve = document.getElementById('reserve');
  const hero = document.querySelector('.hero');

  // --- шапка, прогресс, кнопка на телефоне (работает всегда) ---
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY, vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    const menuOpen = !!document.querySelector('.hd nav.open');
    header.dataset.solid = y > vh * 0.85;
    if (!menuOpen) header.dataset.hidden = y > vh && y > lastY + 3 ? 'true' : (y < lastY - 3 || y < vh ? 'false' : header.dataset.hidden);
    lastY = y;
    header.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    const inlineCta = [...document.querySelectorAll('a[href="#reserve"]')].some(a => {
      if (a.closest('.hd') || a.closest('.dock')) return false;
      const r = a.getBoundingClientRect();
      return r.bottom > 0 && r.top < vh;
    });
    if (dock) dock.dataset.show = y > hero.offsetHeight * 0.7 && reserve.getBoundingClientRect().top > vh * 0.9 && !menuOpen && !inlineCta;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // активный пункт меню
  const links = [...document.querySelectorAll('.hd nav a')];
  const navSecs = links.map(a => document.querySelector(a.getAttribute('href')));
  const markNav = () => {
    const mid = innerHeight / 2;
    navSecs.forEach((s, i) => {
      if (!s) return;
      const box = (s.closest('.pin-spacer') || s).getBoundingClientRect();
      box.top <= mid && box.bottom > mid ? links[i].setAttribute('aria-current', 'true') : links[i].removeAttribute('aria-current');
    });
  };
  addEventListener('scroll', markNav, { passive: true }); markNav();

  // --- живое видео (Magnific): <video data-src="media/имя"> поверх своего фото ---
  // Файлы: имя.av1.mp4 (AV1) → имя.mp4 (H.264), браузер берёт первый, что умеет; «-sm» — для
  // маленьких кадров: портретный кроп первого экрана на телефоне, 960p для кадра в рамке.
  // Источник подставляется на подлёте к экрану (первый экран — после load, чтобы не спорить
  // с LCP). Петля играет, пока видна; data-once — один «вдох» огня при раскрытии рамки,
  // замирает на последнем кадре и повторяется при следующем появлении. Вне экрана и на скрытой
  // вкладке — пауза. При reduce / save-data / 2g видео не грузится, остаётся фото.
  const conn = navigator.connection;
  if (!reduce && !(conn && (conn.saveData || /2g/.test(conn.effectiveType)))) {
    const vids = [...document.querySelectorAll('video[data-src]')], shown = new Set();
    const small = v => {
      const r = v.getBoundingClientRect();
      return v.id === 'hero-video'
        ? matchMedia('(max-width: 860px)').matches && r.width / r.height <= 608 / 1080 // кроп 608×1080 по той же точке 64%
        : r.width * (devicePixelRatio || 1) <= 1000;
    };
    const arm = v => {
      if (v.dataset.armed) return;
      v.dataset.armed = 1;
      const base = v.dataset.src + (small(v) ? '-sm' : '');
      v.innerHTML = `<source src="${base}.av1.mp4" type='video/mp4; codecs="av01.0.08M.10"'><source src="${base}.mp4" type="video/mp4">`;
      v.preload = 'auto';
      v.addEventListener('playing', () => v.classList.add('on'), { once: true });
      v.load();
    };
    const sync = v => shown.has(v) && !document.hidden && !(v.ended && 'once' in v.dataset) ? v.play().catch(() => {}) : v.pause();
    // подгрузка заранее: следим за секцией — сам кадр до раскрытия закрыт clip-path и «невидим» для IO
    const zone = v => v.closest('section') || v;
    const near = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && vids.forEach(v => zone(v) === e.target && arm(v))), { rootMargin: '300px 0px' });
    const seen = new IntersectionObserver(es => es.forEach(({ target: v, isIntersecting, intersectionRatio }) => {
      if ('once' in v.dataset) {
        if (!isIntersecting) { shown.delete(v); v.pause(); if (v.readyState) v.currentTime = 0; return; } // перемотка, пока не видно
        if (intersectionRatio < .35 || shown.has(v)) return; // огонь вспыхивает, когда рамка раскрылась на треть
      } else if (!isIntersecting) { shown.delete(v); return sync(v); }
      shown.add(v); arm(v); sync(v);
    }), { threshold: [0, .35] });
    const watch = () => vids.forEach(v => { near.observe(zone(v)); seen.observe(v); });
    document.readyState === 'complete' ? watch() : addEventListener('load', watch, { once: true });
    document.addEventListener('visibilitychange', () => vids.forEach(sync));
  }

  if (reduce || !window.gsap || !window.ScrollTrigger) { document.querySelector('.loader')?.remove(); return; }
  gsap.registerPlugin(ScrollTrigger);

  // --- плавная прокрутка: только мышь на ПК ---
  let lenis = null;
  if (window.Lenis && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    const nav = document.querySelector('.hd nav');
    new MutationObserver(() => nav.classList.contains('open') ? lenis.stop() : lenis.start()).observe(nav, { attributes: true, attributeFilter: ['class'] });
  }
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); const el = id.length > 1 && document.querySelector(id);
    if (!el) return;
    e.preventDefault(); header.dataset.hidden = 'false';
    lenis ? lenis.scrollTo(el, { duration: 1.6 }) : el.scrollIntoView({ behavior: 'smooth' });
  }));

  const E = 'expo.out';

  // --- прелоадер: печь разогревается до 450 °C, затем занавес уезжает вверх и стартует вход ---
  // Один раз за визит: при переходах и перезагрузках сайт открывается сразу.
  let loader = document.querySelector('.loader');
  if (loader && document.documentElement.classList.contains('lit')) { loader.remove(); loader = null; }
  const num = loader && loader.querySelector('.loader-num');
  const intro = gsap.timeline({ paused: true, defaults: { ease: E } });
  if (loader) {
    // температура 20 → 450 °C; цвет металла: тёмный → вишнёвый → оранжевый → соломенно-белый
    const stops = [[0, [90, 74, 60]], [.35, [150, 32, 12]], [.6, [224, 88, 24]], [.85, [255, 170, 70]], [1, [255, 236, 190]]];
    const heat = k => { let i = 1; while (i < stops.length - 1 && k > stops[i][0]) i++; const [a0, c0] = stops[i - 1], [a1, c1] = stops[i]; const f = (k - a0) / (a1 - a0); return `rgb(${c0.map((v, n) => Math.round(v + (c1[n] - v) * f)).join(',')})`; };
    const c = { v: 0 };
    gsap.to(c, { v: 1, duration: 2.2, ease: 'power2.in', onUpdate: () => { num.textContent = Math.round(20 + c.v * 430); loader.style.setProperty('--h', c.v.toFixed(3)); loader.style.setProperty('--heat', heat(c.v)); }, onComplete: () => {
      loader.classList.add('done'); intro.play(0.001);
      try { sessionStorage.setItem('ember-lit', '1'); } catch (e) {}
      setTimeout(() => loader.remove(), 1200);
    } });
  } else intro.play();

  // --- разбивка заголовков на строки ---
  document.querySelectorAll('[data-split]').forEach(el => {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(p => `<span class="ln"><span>${p.trim()}</span></span>`).join('');
  });

  // --- первый экран: вход ---
  intro.from('.hero-media', { scale: 1.25, duration: 2.4 })
       .from('.hero .wordmark span', { yPercent: 110, duration: 1.6, stagger: 0.07 }, 0.2)
       .from('.hero .ln > span', { yPercent: 110, duration: 1.3, stagger: 0.08 }, 0.7)
       .from('.hero [data-rise]', { y: 30, autoAlpha: 0, duration: 1.2, stagger: 0.12 }, 0.9);

  // --- первый экран: камера отъезжает, слово распадается ---
  gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
    // затемнение — прозрачностью над ночным фоном: без filter на видео и на объёмных буквах
    .to('.hero-media', { scale: 1.2, yPercent: 8, opacity: .45, ease: 'none' }, 0)
    .to('.hero .wordmark', { yPercent: -35, scale: .92, opacity: 0, ease: 'power1.in' }, 0)
    .to('.hero-top', { y: -80, autoAlpha: 0, ease: 'none' }, 0);

  // --- строки заголовков выезжают из-под маски ---
  gsap.utils.toArray('[data-split]').filter(el => !el.closest('.hero')).forEach(el => {
    gsap.from(el.querySelectorAll('.ln > span'), { yPercent: 110, duration: 1.4, ease: E, stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  gsap.utils.toArray('[data-rise]').filter(el => !el.closest('.hero')).forEach(el => {
    gsap.from(el, { y: 50, autoAlpha: 0, duration: 1.3, ease: E, scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // --- резная линия статистики прорисовывается слева направо (цифры не «считаются») ---
  gsap.fromTo('.stat', { clipPath: 'inset(-20px 100% -20px -20px)' }, { clipPath: 'inset(-20px -20px -20px -20px)', duration: 1.4, ease: 'expo.inOut', stagger: 0.18, scrollTrigger: { trigger: '.manifesto-foot', start: 'top 85%' } });

  // --- кадры кухни: разная скорость и раскрытие ---
  gsap.utils.toArray('.kitchen figure').forEach((f, i) => {
    gsap.fromTo(f, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.6, ease: 'expo.inOut', delay: i * 0.1, scrollTrigger: { trigger: f, start: 'top 85%' } });
    const img = f.querySelector('img');
    gsap.fromTo(f, { y: -6 * +img.dataset.drift }, { y: 6 * +img.dataset.drift, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // --- фото шефа: занавес + параллакс ---
  gsap.fromTo('.chef-photo', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.8, ease: 'expo.inOut', scrollTrigger: { trigger: '.chef', start: 'top 70%' } });
  gsap.utils.toArray('[data-parallax]').forEach(img => {
    gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });


  // --- события: три формата одним разворотом, карточки поднимаются лесенкой ---
  // (раньше — горизонтальная лента с закреплением: ~700px «пустой» прокрутки ради трёх карточек)
  gsap.from('#events .ev', { y: 60, autoAlpha: 0, duration: 1.3, ease: E, stagger: 0.12, scrollTrigger: { trigger: '#events .track', start: 'top 85%' } });

  // --- цитата: слова загораются по прокрутке ---
  const q = document.querySelector('[data-words]');
  if (q) {
    q.innerHTML = q.textContent.trim().split(/\s+/).map(w => `<span class="w" style="display:inline-block">${w}</span>`).join(' ');
    gsap.fromTo(q.querySelectorAll('.w'), { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top 60%', end: 'center 45%', scrub: true } });
  }

  // --- бронь: светлая половина приезжает, форма проявляется ---
  gsap.from('.reserve-info', { clipPath: 'inset(0 100% 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.reserve', start: 'top 70%' } });

  // --- футер: огромное слово поднимается ---
  gsap.from('.ft .wordmark', { yPercent: 40, ease: 'none', scrollTrigger: { trigger: '.ft', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  addEventListener('load', () => ScrollTrigger.refresh());
});
