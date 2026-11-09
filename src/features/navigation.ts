export {};
const dialog = document.querySelector<HTMLDialogElement>('#site-menu');
const open = document.querySelector<HTMLButtonElement>('[data-menu-open]');
const close = dialog?.querySelector<HTMLButtonElement>('[data-menu-close]');
if (dialog && open && close) {
  let previousOverflow = '';
  open.addEventListener('click', () => {
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    open.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    close.focus();
  });
  const dismiss = () => dialog.close();
  close.addEventListener('click', dismiss);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dismiss();
  });
  dialog.addEventListener('close', () => {
    open.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = previousOverflow;
    open.focus();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [
      ...dialog.querySelectorAll<HTMLElement>('a[href],button'),
    ];
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  matchMedia('(min-width: 1200px)').addEventListener('change', (event) => {
    if (event.matches && dialog.open) dismiss();
  });
}
document
  .querySelector('.skip-link')
  ?.addEventListener('click', () =>
    document.querySelector<HTMLElement>('#main')?.focus(),
  );
const header = document.querySelector('.site-header');
const updateHeader = () =>
  header?.classList.toggle('has-scrolled', scrollY > 8);
addEventListener('scroll', updateHeader, { passive: true });
updateHeader();
