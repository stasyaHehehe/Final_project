import { qs } from '../utils/dom.js';

export function initHeader() {
  const header = qs('#header');
  if (!header) return;

  let ticking = false;
  const update = () => {
    const scrolled = window.scrollY > 8;
    header.classList.toggle('is-stuck', scrolled);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}
