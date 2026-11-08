export function withBase(path: string, basePath: string): string {
  const internal = (value: string) =>
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !/[\\?#\s]/.test(value) &&
    !value.split('/').some((part) => part === '.' || part === '..');
  if (!internal(path) || !internal(basePath))
    throw new Error('Expected an internal root-relative path');
  const prefix = basePath === '/' ? '' : basePath.replace(/\/$/, '');
  return `${prefix}${path}`;
}
