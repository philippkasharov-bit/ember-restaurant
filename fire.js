// Живой огонь первого экрана: зацикленная съёмка настоящего пламени (Pexels) поверх фото.
// Чёрный фон ролика убирается режимом наложения screen. На телефоне, при экономии трафика
// и при «уменьшить движение» остаётся статичное фото.
(() => {
  const hero = document.querySelector('.hero');
  const conn = navigator.connection;
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(max-width: 700px)').matches || (conn && (conn.saveData || /2g/.test(conn.effectiveType)))) return;

  const v = document.createElement('video');
  v.className = 'fire';
  v.muted = v.loop = v.playsInline = true;
  v.setAttribute('aria-hidden', 'true');
  v.preload = 'none';
  v.innerHTML = '<source src="fire.webm?v=2" type="video/webm"><source src="fire.mp4?v=2" type="video/mp4">';
  hero.prepend(v);

  // грузим после отрисовки первого экрана, показываем плавно, когда кадр готов
  const start = () => { v.load(); v.play().catch(() => v.remove()); };
  v.addEventListener('playing', () => v.classList.add('on'), { once: true });
  if (document.readyState === 'complete') setTimeout(start, 200); else addEventListener('load', () => setTimeout(start, 200));

  // при прокрутке огонь гаснет; вне экрана ролик на паузе
  let raf = 0;
  const cool = () => { raf = 0; hero.style.setProperty('--heat', Math.max(0, 1 - scrollY / (hero.clientHeight * .85)).toFixed(3)); };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(cool); }, { passive: true });
  new IntersectionObserver(([e]) => { if (!v.classList.contains('on')) return; e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); else if (v.classList.contains('on')) v.play().catch(() => {}); });
})();
