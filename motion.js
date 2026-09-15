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
    if (dock) dock.dataset.show = y > hero.offsetHeight * 0.7 && reserve.getBoundingClientRect().top > vh * 0.9 && !menuOpen;
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

  // --- видео первого экрана: на ПК и хорошей сети, иначе остаётся кадр-постер ---
  const hv = document.getElementById('hero-video');
  const conn = navigator.connection;
  if (hv && !reduce && matchMedia('(min-width: 861px)').matches && !(conn && (conn.saveData || /2g/.test(conn.effectiveType)))) {
    hv.innerHTML = '<source src="hero.webm" type="video/webm"><source src="hero.mp4" type="video/mp4">';
    hv.addEventListener('playing', () => hv.classList.add('on'), { once: true });
    const go = () => { hv.load(); hv.play().catch(() => {}); };
    document.readyState === 'complete' ? go() : addEventListener('load', go);
    new IntersectionObserver(([e]) => e.isIntersecting ? hv.play().catch(() => {}) : hv.pause()).observe(hv);
  }

  // --- превью блюда рядом с курсором ---
  const peek = document.querySelector('.dish-peek');
  if (peek && matchMedia('(hover: hover)').matches) {
    const pi = peek.querySelector('img');
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0;
    const loop = () => { cx += (x - cx) * 0.18; cy += (y - cy) * 0.18; peek.style.left = cx + 'px'; peek.style.top = cy + 'px'; raf = peek.classList.contains('on') ? requestAnimationFrame(loop) : 0; };
    document.querySelectorAll('.dish[data-img]').forEach(d => {
      d.addEventListener('mouseenter', e => { pi.src = d.dataset.img; x = cx = e.clientX + 180; y = cy = e.clientY; peek.classList.add('on'); if (!raf) raf = requestAnimationFrame(loop); });
      d.addEventListener('mousemove', e => { x = e.clientX + 180; y = e.clientY; });
      d.addEventListener('mouseleave', () => peek.classList.remove('on'));
    });
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

  // --- прелоадер: счёт до 100, затем занавес уезжает вверх и стартует вход ---
  const loader = document.querySelector('.loader');
  const num = loader && loader.querySelector('.loader-num');
  const intro = gsap.timeline({ paused: true, defaults: { ease: E } });
  if (loader) {
    // температура 20 → 450 °C; цвет металла: тёмный → вишнёвый → оранжевый → соломенно-белый
    const stops = [[0, [90, 74, 60]], [.35, [150, 32, 12]], [.6, [224, 88, 24]], [.85, [255, 170, 70]], [1, [255, 236, 190]]];
    const heat = k => { let i = 1; while (i < stops.length - 1 && k > stops[i][0]) i++; const [a0, c0] = stops[i - 1], [a1, c1] = stops[i]; const f = (k - a0) / (a1 - a0); return `rgb(${c0.map((v, n) => Math.round(v + (c1[n] - v) * f)).join(',')})`; };
    const c = { v: 0 };
    gsap.to(c, { v: 1, duration: 2.2, ease: 'power2.in', onUpdate: () => { num.textContent = Math.round(20 + c.v * 430); loader.style.setProperty('--h', c.v.toFixed(3)); loader.style.setProperty('--heat', heat(c.v)); }, onComplete: () => {
      loader.classList.add('done'); intro.play(0.001);
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
    .to('.hero-media', { scale: 1.2, yPercent: 8, filter: 'brightness(.45) saturate(.6)', ease: 'none' }, 0)
    .to('.hero .wordmark', { yPercent: -35, scale: .92, opacity: 0, filter: 'blur(8px)', ease: 'power1.in' }, 0)
    .to('.hero-top', { y: -80, autoAlpha: 0, ease: 'none' }, 0);

  // --- строки заголовков выезжают из-под маски ---
  gsap.utils.toArray('[data-split]').filter(el => !el.closest('.hero')).forEach(el => {
    gsap.from(el.querySelectorAll('.ln > span'), { yPercent: 110, duration: 1.4, ease: E, stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  gsap.utils.toArray('[data-rise]').filter(el => !el.closest('.hero')).forEach(el => {
    gsap.from(el, { y: 50, autoAlpha: 0, duration: 1.3, ease: E, scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // --- манифест: фото-«таблетки» раскрываются ---
  gsap.from('.pill', { width: 0, duration: 1.4, ease: E, stagger: 0.15, scrollTrigger: { trigger: '.manifesto p', start: 'top 70%' } });

  // --- линии статистики прорисовываются, ромбы вспыхивают ---
  gsap.fromTo('.stat', { clipPath: 'inset(-20px 100% -20px -20px)' }, { clipPath: 'inset(-20px -20px -20px -20px)', duration: 1.4, ease: 'expo.inOut', stagger: 0.18, scrollTrigger: { trigger: '.manifesto-foot', start: 'top 85%' } });

  // --- счётчики ---
  document.querySelectorAll('[data-count]').forEach(b => {
    const to = parseFloat(b.dataset.count), dec = b.dataset.count.includes('.') ? 1 : 0, o = { v: 0 };
    gsap.to(o, { v: to, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 90%' }, onUpdate: () => b.textContent = o.v.toFixed(dec) });
  });

  // --- кадры кухни: разная скорость и раскрытие ---
  gsap.utils.toArray('.kitchen figure').forEach((f, i) => {
    gsap.fromTo(f, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.6, ease: 'expo.inOut', delay: i * 0.1, scrollTrigger: { trigger: f, start: 'top 85%' } });
    const img = f.querySelector('img');
    gsap.fromTo(img, { yPercent: -+img.dataset.drift }, { yPercent: +img.dataset.drift, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // --- фото шефа: занавес + параллакс ---
  gsap.fromTo('.chef-photo', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.8, ease: 'expo.inOut', scrollTrigger: { trigger: '.chef', start: 'top 70%' } });
  gsap.utils.toArray('[data-parallax]').forEach(img => {
    gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });


  const mm = gsap.matchMedia();
  // --- события: горизонтальная лента на ПК ---
  mm.add('(min-width: 1024px)', () => {
    const sec = document.getElementById('events'), track = sec.querySelector('.track');
    gsap.set(track, { display: 'flex', width: 'max-content' });
    gsap.set(track.children, { width: 'min(46vw, 680px)' });
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true } });
    track.querySelectorAll('figure img').forEach(img => {
      gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
    });
    return () => { gsap.set(track, { clearProps: 'all' }); gsap.set(track.children, { clearProps: 'all' }); };
  });

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
