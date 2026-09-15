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
  const nio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.getAttribute('href') === '#' + e.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(a => { const s = document.querySelector(a.getAttribute('href')); s && nio.observe(s); });

  if (reduce || !window.gsap || !window.ScrollTrigger) return;
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

  // --- разбивка заголовков на строки ---
  document.querySelectorAll('[data-split]').forEach(el => {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(p => `<span class="ln"><span>${p.trim()}</span></span>`).join('');
  });

  // --- первый экран: вход ---
  const intro = gsap.timeline({ defaults: { ease: E } });
  intro.from('.hero-media img', { scale: 1.3, duration: 2.4 })
       .from('.wordmark span', { yPercent: 110, duration: 1.6, stagger: 0.07 }, 0.2)
       .from('.hero .ln > span', { yPercent: 110, duration: 1.3, stagger: 0.08 }, 0.7)
       .from('.hero [data-rise]', { y: 30, autoAlpha: 0, duration: 1.2, stagger: 0.12 }, 0.9);

  // --- первый экран: камера отъезжает, слово распадается ---
  gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero-media img', { scale: 1.25, yPercent: 8, filter: 'brightness(.45) saturate(.6)', ease: 'none' }, 0)
    .to('.wordmark span', { yPercent: (i) => -30 - i * 18, ease: 'none' }, 0)
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

  // --- счётчики ---
  document.querySelectorAll('[data-count]').forEach(b => {
    const to = parseFloat(b.dataset.count), dec = b.dataset.count.includes('.') ? 1 : 0, o = { v: 0 };
    gsap.to(o, { v: to, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 90%' }, onUpdate: () => b.textContent = o.v.toFixed(dec) });
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
