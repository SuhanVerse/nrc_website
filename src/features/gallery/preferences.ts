export const preferenceKey = 'nce:auto-photos';
export function automaticPhotos(): boolean {
  try {
    return localStorage.getItem(preferenceKey) !== 'off';
  } catch {
    return true;
  }
}
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
