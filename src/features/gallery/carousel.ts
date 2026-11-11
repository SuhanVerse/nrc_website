import { reducedMotion } from './preferences';

document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((gallery) => {
  const images = [
    ...gallery.querySelectorAll<HTMLImageElement>('.photo-window img'),
  ];
  const caption = gallery.querySelector<HTMLElement>('[data-gallery-caption]');
  const error = gallery.querySelector<HTMLElement>('[data-gallery-error]');
  const status = gallery.querySelector<HTMLElement>('[data-gallery-status]');
  const navigation = gallery.querySelector<HTMLElement>(
    '[data-gallery-navigation]',
  );
  const buttons = [
    ...gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-select]'),
  ];
  let current = 0;
  let visible = false;
  let hovered = false;
  let held = false;
  let requestSequence = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const failed = new Set<number>();
  const allowed = () =>
    visible &&
    !document.hidden &&
    !reducedMotion.matches &&
    !held &&
    !hovered &&
    !gallery.contains(document.activeElement);

  function schedule() {
    clearTimeout(timer);
    if (allowed() && failed.size < images.length - 1)
      timer = setTimeout(advance, 3000);
  }

  async function showPhoto(next: number, manual = false) {
    clearTimeout(timer);
    const request = ++requestSequence;
    if (manual) held = true;
    const image = images[next];
    if (!image || next === current) return;
    image.srcset = image.dataset.srcset ?? '';
    image.src = image.dataset.src ?? '';
    try {
      await image.decode();
      if (request !== requestSequence) return;
      if (manual || allowed()) {
        images[current].classList.remove('photo-active');
        images[current].setAttribute('aria-hidden', 'true');
        image.classList.add('photo-active');
        image.removeAttribute('aria-hidden');
        current = next;
        if (caption) caption.textContent = image.dataset.caption ?? '';
        if (error) error.hidden = true;
        if (status) status.textContent = '';
        buttons.forEach((button, index) =>
          button.setAttribute('aria-pressed', String(index === current)),
        );
      }
    } catch {
      failed.add(next);
      if (manual && request === requestSequence && status)
        status.textContent = 'Photo unavailable. Choose another photo.';
    }
    if (request === requestSequence) schedule();
  }

  function advance() {
    if (!allowed()) return;
    let next = (current + 1) % images.length;
    while (failed.has(next) && next !== current)
      next = (next + 1) % images.length;
    void showPhoto(next);
  }

  buttons.forEach((button, index) =>
    button.addEventListener('click', () => void showPhoto(index, true)),
  );
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
  gallery.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    hovered = true;
    schedule();
  });
  gallery.addEventListener('pointerleave', () => {
    hovered = false;
    schedule();
  });
  gallery.addEventListener('focusin', schedule);
  gallery.addEventListener('focusout', () => queueMicrotask(schedule));
  reducedMotion.addEventListener('change', schedule);
  addEventListener('pagehide', () => {
    clearTimeout(timer);
    requestSequence++;
    observer.disconnect();
  });
  addEventListener('pageshow', () => observer.observe(gallery));
  if (navigation) navigation.hidden = false;
});
