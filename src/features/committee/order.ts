const names = new Intl.Collator('en', { sensitivity: 'base' });
const positions = new Map([
  ['president', 0],
  ['r&d head', 1],
  ['secretary', 2],
  ['treasurer', 3],
  ['event manager', 4],
  ['member', 6],
]);

export function sortCommittee<
  T extends { academicLabel: string; name: string; role: string },
>(members: readonly T[]): T[] {
  const batch = (label: string) =>
    Number(label.match(/\b(\d{3})\b/)?.[1] ?? Infinity);
  const position = (role: string) =>
    positions.get(role.trim().toLowerCase()) ?? 5;
  return [...members].sort(
    (a, b) =>
      position(a.role) - position(b.role) ||
      batch(a.academicLabel) - batch(b.academicLabel) ||
      names.compare(a.name, b.name),
  );
}
