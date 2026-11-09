export const preferenceKey = 'nce:auto-photos';
export function automaticPhotos(): boolean {
  try {
    return localStorage.getItem(preferenceKey) !== 'off';
  } catch {
    return true;
  }
}
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
export function setAutomaticPhotos(enabled: boolean) {
  try {
    localStorage.setItem(preferenceKey, enabled ? 'on' : 'off');
  } catch {
    // The carousel keeps the current choice when storage is unavailable.
  }
}
