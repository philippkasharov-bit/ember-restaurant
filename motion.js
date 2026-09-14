// EMBER: шапка, главы и анимации. Один язык движения — всё поднимается, как тепло.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.site-header');

  // --- заголовки: каждая строка поднимается из-под маски ---
  document.querySelectorAll('[data-anim=lines]').forEach(h => {
    const parts = h.innerHTML.split(/<br\s*\/?>/i);
    h.innerHTML = parts.map((p, i) => `<span class="ln" style="--ld:${i * 0.12}s"><span>${p.trim()}</span></span>`).join('');
  });

  // --- цитата: слова «загораются» по мере прокрутки ---
  const quote = document.querySelector('[data-anim=words]');
  let words = [];
  if (quote) {
    quote.innerHTML = quote.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
    words = [...quote.querySelectorAll('.w')];
  }

  // --- задержки для списков ---
  document.querySelectorAll('[data-anim=item]').forEach((el, i) => el.style.setProperty('--d', `${i * 0.08}s`));
  document.querySelectorAll('[data-anim=card]').forEach((el, i) => el.style.setProperty('--d', `${i * 0.12}s`));

  // --- счётчики ---
  const count = el => {
    const to = parseFloat(el.dataset.count), dec = String(el.dataset.count).includes('.') ? 1 : 0;
    if (reduce) return;
    const t0 = performance.now(), dur = 1600;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = (to * e).toFixed(dec);
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = (0).toFixed(dec);
    requestAnimationFrame(step);
  };

  // --- появление при прокрутке ---
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      pending = pending.filter(x => x !== e.target);
      e.target.querySelectorAll?.('[data-count]').forEach(count);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  let pending = [...document.querySelectorAll('[data-anim], .ornament')];
  pending.forEach(el => io.observe(el));

  // --- активный раздел в навигации ---
  const links = [...document.querySelectorAll('header nav a')];
  const secs = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const navIo = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
      links.forEach(a => a.hasAttribute('aria-current') && a.setAttribute('aria-current', 'true'));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => navIo.observe(s));

  // --- прокрутка: шапка, прогресс, параллакс, цитата ---
  const photo = document.querySelector('[data-parallax]');
  const bandBg = document.querySelector('[data-parallax-bg]');
  const band = bandBg && bandBg.parentElement;
  let lastY = scrollY, ticking = false;

  const onScroll = () => {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;

    header.dataset.state = y > 40 ? 'solid' : 'top';
    const menuOpen = document.querySelector('header nav.open');
    header.dataset.hidden = (!reduce && !menuOpen && y > vh * 0.9 && y > lastY + 4) ? 'true' : (y < lastY - 4 || y < vh * 0.9 ? 'false' : header.dataset.hidden);
    lastY = y;
    header.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);

    // страховка: всё, что уже выше низа экрана, показываем даже при очень быстрой прокрутке
    pending = pending.filter(el => {
      if (el.getBoundingClientRect().top < vh * 0.92) { el.classList.add('in'); el.querySelectorAll?.('[data-count]').forEach(count); io.unobserve(el); return false; }
      return true;
    });

    if (reduce) return;
    if (photo) {
      const r = photo.getBoundingClientRect();
      const k = (r.top + r.height / 2 - vh / 2) / vh;
      photo.style.setProperty('--py', `${(k * -40).toFixed(1)}px`);
    }
    if (band) {
      const r = band.getBoundingClientRect();
      const k = (r.top + r.height / 2 - vh / 2) / vh;
      bandBg.style.setProperty('--by', `${(k * 90).toFixed(1)}px`);
      // слова загораются, пока полоса проходит через центр экрана
      const prog = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.6)));
      const lit = Math.round(prog * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // якорные ссылки: учитываем высоту шапки
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id); if (!el) return;
    e.preventDefault();
    header.dataset.hidden = 'false';
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - 60, behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  }));
})();
