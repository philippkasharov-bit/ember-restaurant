// Общие мелочи: бургер-меню, появление секций при скролле, демо-отправка формы
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('header nav');
  if (burger && nav) {
    const setOpen = open => {
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    };
    burger.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  document.querySelectorAll('form:not([data-demo])').forEach(f => {
    const btn = f.querySelector('button[type=submit], button:not([type])');
    const label = btn.textContent;
    const msg = document.createElement('p');
    msg.className = 'form-msg';
    msg.setAttribute('role', 'status');
    btn.after(msg);

    f.noValidate = true;
    f.addEventListener('submit', e => {
      e.preventDefault();
      const bad = [...f.elements].find(el => el.willValidate && !el.checkValidity());
      f.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
      if (bad) {
        bad.setAttribute('aria-invalid', 'true');
        bad.focus();
        msg.dataset.state = 'error';
        msg.textContent = `Заполните поле «${bad.getAttribute('aria-label')}», чтобы мы могли связаться с вами.`;
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Отправляем…';
      msg.textContent = '';
      setTimeout(() => {
        btn.textContent = 'Заявка отправлена ✓';
        msg.dataset.state = 'ok';
        const data = Object.fromEntries(new FormData(f));
        const tpl = f.dataset.success || 'Спасибо! Мы перезвоним в течение 15 минут.';
        msg.textContent = tpl.replace(/\{(\w+)\}/g, (_, k) => data[k] || '');
        f.dispatchEvent(new CustomEvent('demo:sent', { detail: data }));
        f.reset();
        setTimeout(() => { btn.disabled = false; btn.textContent = label; }, 4000);
      }, 900);
    });
  });
});
