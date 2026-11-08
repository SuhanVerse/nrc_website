export function sortCommittee<T extends { academicLabel: string }>(
  members: readonly T[],
): T[] {
  const batch = (label: string) =>
    Number(label.match(/\b(0\d{2})\b/)?.[1] ?? Infinity);
  return [...members].sort(
    (a, b) => batch(a.academicLabel) - batch(b.academicLabel),
  );
}
