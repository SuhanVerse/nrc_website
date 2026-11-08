export const preferenceKey = 'nce:auto-photos';
export function automaticPhotos(): boolean {
  try {
    return localStorage.getItem(preferenceKey) !== 'off';
  } catch {
    return true;
  }
}
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const toggle = document.querySelector<HTMLButtonElement>(
  '[data-motion-toggle]',
);
const status = document.querySelector<HTMLElement>('[data-motion-status]');
const note = document.querySelector<HTMLElement>('[data-reduced-note]');
let preference = automaticPhotos();
function render() {
  if (!toggle || !status || !note) return;
  toggle.hidden = false;
  toggle.setAttribute('aria-pressed', String(preference));
  toggle.textContent = preference ? 'Turn off' : 'Turn on';
  status.textContent = preference
    ? 'On · Photographs change gently every six seconds.'
    : 'Off · Photographs stay still.';
  note.hidden = !reducedMotion.matches;
}
toggle?.addEventListener('click', () => {
  preference = !preference;
  try {
    localStorage.setItem(preferenceKey, preference ? 'on' : 'off');
  } catch {
    /* The current page still reflects the choice. */
  }
  dispatchEvent(new Event('photo-preference'));
  render();
});
reducedMotion.addEventListener('change', render);
render();
