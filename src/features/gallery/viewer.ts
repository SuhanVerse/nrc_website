export {};
const dialog = document.querySelector<HTMLDialogElement>('#photo-viewer');
const links = [
  ...document.querySelectorAll<HTMLAnchorElement>('[data-photo-open]'),
];
if (dialog && links.length) {
  const image = dialog.querySelector<HTMLImageElement>('[data-viewer-image]')!;
  const caption = dialog.querySelector<HTMLElement>('[data-viewer-caption]')!;
  const count = dialog.querySelector<HTMLElement>('[data-viewer-count]')!;
  const error = dialog.querySelector<HTMLElement>('[data-viewer-error]')!;
  const close = dialog.querySelector<HTMLButtonElement>('[data-viewer-close]')!;
  let index = 0,
    opener: HTMLElement | null = null,
    previousOverflow = '';
  function show(next: number) {
    index = (next + links.length) % links.length;
    const link = links[index];
    image.hidden = false;
    error.hidden = true;
    image.src = link.href;
    image.alt = link.dataset.photoCaption ?? 'Yatra photograph';
    caption.textContent = image.alt;
    count.textContent = `${index + 1} / ${links.length}`;
    dialog!.setAttribute(
      'aria-label',
      `Yatra photograph ${index + 1} of ${links.length}`,
    );
  }
  links.forEach((link, i) =>
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      opener = link;
      previousOverflow = document.body.style.overflow;
      show(i);
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      close.focus();
    }),
  );
  image.addEventListener('error', () => {
    image.hidden = true;
    error.hidden = false;
  });
  close.addEventListener('click', () => dialog.close());
  dialog
    .querySelector('[data-viewer-prev]')
    ?.addEventListener('click', () => show(index - 1));
  dialog
    .querySelector('[data-viewer-next]')
    ?.addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      show(index - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + 1);
    }
    if (event.key === 'Tab') {
      const controls = [
        ...dialog.querySelectorAll<HTMLButtonElement>('button'),
      ];
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault();
        controls.at(-1)?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === controls.at(-1)
      ) {
        event.preventDefault();
        controls[0]?.focus();
      }
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    opener?.focus();
  });
}
