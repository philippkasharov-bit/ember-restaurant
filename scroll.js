// Кино-прокрутка по официальному рецепту Lenis + GSAP ScrollTrigger
// (https://github.com/darkroomengineering/lenis#gsap-scrolltrigger и GSAP "horizontal scroll" demo).
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  gsap.registerPlugin(ScrollTrigger);

  // 1. Плавная прокрутка только для мыши на ПК; синхронизация с ScrollTrigger через тикер GSAP
  if (window.Lenis && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    const nav = document.querySelector('header nav');
    new MutationObserver(() => nav.classList.contains('open') ? lenis.stop() : lenis.start())
      .observe(nav, { attributes: true, attributeFilter: ['class'] });
  }

  // 2. Первый экран «остывает»: камера отъезжает, картинка тускнеет, текст уходит вверх
  const hero = document.querySelector('.hero');
  gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
    .to(hero, { '--cool': 1, ease: 'none' }, 0);

  const mm = gsap.matchMedia();

  // 3. События: закреплённый раздел, карточки едут горизонтально (только ПК)
  mm.add('(min-width: 1024px)', () => {
    const sec = document.getElementById('events');
    const list = sec.querySelector('.events-list');
    sec.classList.add('gs-h');
    const dist = () => Math.max(0, list.scrollWidth - innerWidth + innerWidth * 0.06);
    const tween = gsap.to(list, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    // параллакс фото внутри карточек относительно горизонтального движения
    list.querySelectorAll('.ev').forEach(card => {
      gsap.fromTo(card.querySelector('.ev-img'), { xPercent: -8 }, {
        xPercent: 8, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
      });
    });
    return () => sec.classList.remove('gs-h');
  });

  // 4. Фото шефа и полоса-цитата: мягкий параллакс
  gsap.fromTo('.photo', { '--py': '40px' }, { '--py': '-40px', ease: 'none', scrollTrigger: { trigger: '.photo', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.band-bg', { yPercent: -10 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: true } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
