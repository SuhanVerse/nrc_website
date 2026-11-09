import {
  automaticPhotos,
  reducedMotion,
  setAutomaticPhotos,
} from './preferences';

document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((gallery) => {
  const images = [
    ...gallery.querySelectorAll<HTMLImageElement>('.photo-window img'),
  ];
  const caption = gallery.querySelector<HTMLElement>('[data-gallery-caption]');
  const error = gallery.querySelector<HTMLElement>('[data-gallery-error]');
  const toggle = gallery.querySelector<HTMLButtonElement>(
    '[data-gallery-toggle]',
  );
  let enabled = automaticPhotos();
  let current = 0,
    visible = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;
  const failed = new Set<number>();
  const allowed = () =>
    visible &&
    !document.hidden &&
    !reducedMotion.matches &&
    enabled &&
    !gallery.contains(document.activeElement);
  function renderToggle() {
    if (!toggle) return;
    toggle.hidden = reducedMotion.matches;
    toggle.setAttribute(
      'aria-label',
      enabled ? 'Pause slideshow' : 'Play slideshow',
    );
    toggle
      .querySelector<HTMLElement>('[data-pause-icon]')
      ?.toggleAttribute('hidden', !enabled);
    toggle
      .querySelector<HTMLElement>('[data-play-icon]')
      ?.toggleAttribute('hidden', enabled);
  }
  toggle?.addEventListener('click', () => {
    enabled = !enabled;
    setAutomaticPhotos(enabled);
    renderToggle();
    schedule();
  });
  function schedule() {
    clearTimeout(timer);
    if (allowed() && failed.size < images.length - 1)
      timer = setTimeout(advance, 6000);
  }
  async function advance() {
    if (!allowed() || busy) return;
    busy = true;
    let next = (current + 1) % images.length;
    while (failed.has(next) && next !== current)
      next = (next + 1) % images.length;
    const image = images[next];
    if (!image) {
      busy = false;
      return;
    }
    image.srcset = image.dataset.srcset ?? '';
    image.src = image.dataset.src ?? '';
    try {
      await image.decode();
      if (allowed()) {
        images[current].classList.remove('photo-active');
        images[current].setAttribute('aria-hidden', 'true');
        image.classList.add('photo-active');
        image.removeAttribute('aria-hidden');
        current = next;
        if (caption) caption.textContent = image.dataset.caption ?? '';
        if (error) error.hidden = true;
      }
    } catch {
      failed.add(next);
    }
    busy = false;
    schedule();
  }
  images[0]?.addEventListener('error', () => {
    if (error) error.hidden = false;
  });
  if (images[0]?.complete && images[0].naturalWidth === 0 && error)
    error.hidden = false;
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    schedule();
  });
  observer.observe(gallery);
  document.addEventListener('visibilitychange', schedule);
  gallery.addEventListener('focusin', schedule);
  gallery.addEventListener('focusout', () => queueMicrotask(schedule));
  reducedMotion.addEventListener('change', () => {
    renderToggle();
    schedule();
  });
  addEventListener('storage', () => {
    enabled = automaticPhotos();
    renderToggle();
    schedule();
  });
  addEventListener('pagehide', () => {
    clearTimeout(timer);
    observer.disconnect();
  });
  addEventListener('pageshow', () => observer.observe(gallery));
  renderToggle();
});
