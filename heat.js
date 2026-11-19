// EMBER · «Шкала жара»: розжиг цифр, шкала-навигация, тарелка меню, ленивое видео.
// Без библиотек. При «уменьшить движение» — статичные 450° и кадр-постер, видео не грузится.
addEventListener('DOMContentLoaded', () => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection;
  const lite = reduce || (conn && (conn.saveData || /2g/.test(conn.effectiveType)));
  const root = document.documentElement;

  // --- розжиг: 20° → 450°, вес Unbounded 200 → 800 ---
  const ink = document.getElementById('temp');
  if (ink && !reduce) {
    const sup = ink.querySelector('sup').outerHTML, t0 = performance.now(), D = 1800;
    const step = now => {
      const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
      ink.innerHTML = Math.round(20 + e * 430) + sup;
      ink.style.setProperty('--w', Math.round(200 + e * 600));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // --- шкала: ртуть по прокрутке, активная зона по середине экрана ---
  const links = [...document.querySelectorAll('.rail li a')];
  const zones = links.map(a => document.querySelector(a.getAttribute('href')));
  let raf = 0;
  const onScroll = () => {
    raf = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    root.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
    const mid = innerHeight / 2;
    let cur = 0;
    zones.forEach((z, i) => { if (z && z.getBoundingClientRect().top <= mid) cur = i; });
    links.forEach((a, i) => i === cur ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(onScroll); }, { passive: true });
  onScroll();

  // --- видео: AV1 → H.264, «-sm» для маленьких кадров; грузится у экрана, играет только в кадре ---
  if (!lite) {
    const vids = [...document.querySelectorAll('video[data-src]')];
    const arm = v => {
      if (v.dataset.armed) return;
      v.dataset.armed = 1;
      const r = v.getBoundingClientRect(), small = r.width * (devicePixelRatio || 1) <= 1000;
      const base = v.dataset.src + (small && v.id !== 'hero-video' ? '-sm' : '');
      v.innerHTML = `<source src="${base}.av1.mp4" type='video/mp4; codecs="av01.0.08M.10"'><source src="${base}.mp4" type="video/mp4">`;
      v.addEventListener('playing', () => v.classList.add('on'), { once: true });
      v.load();
    };
    const seen = new Set();
    const sync = v => seen.has(v) && !document.hidden ? v.play().catch(() => {}) : v.pause();
    const io = new IntersectionObserver(es => es.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) { arm(v); seen.add(v); } else seen.delete(v);
      sync(v);
    }), { rootMargin: '300px 0px' });
    const watch = () => vids.forEach(v => io.observe(v));
    document.readyState === 'complete' ? watch() : addEventListener('load', watch, { once: true });
    document.addEventListener('visibilitychange', () => vids.forEach(sync));
  }

  // --- меню: строка ставит свой кадр и стрелку жара; рибай — живое пламя ---
  const shot = document.getElementById('plate-shot'), gauge = document.getElementById('gauge'), pt = document.getElementById('plate-t');
  document.querySelectorAll('.row').forEach(r => {
    const on = () => {
      document.querySelectorAll('.row').forEach(x => x.classList.toggle('is-on', x === r));
      if (r.dataset.shot) { shot.src = r.dataset.shot; shot.classList.add('show'); } else shot.classList.remove('show');
      gauge.style.setProperty('--g', r.dataset.g);
      pt.textContent = r.querySelector('.t').textContent;
    };
    r.addEventListener('mouseenter', on); r.addEventListener('focus', on);
  });
});
