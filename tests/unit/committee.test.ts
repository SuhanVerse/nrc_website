import assert from 'node:assert/strict';
import test from 'node:test';
import { sortCommittee } from '../../src/features/committee/order.ts';

test('senior batches lead; same-batch source order is stable and input unchanged', () => {
  const input = [
    { name: 'a', academicLabel: 'BEI 082' },
    { name: 'b', academicLabel: 'BCT 080' },
    { name: 'c', academicLabel: 'BCT 079' },
    { name: 'd', academicLabel: 'BEI 080' },
    { name: 'e', academicLabel: 'BEI 081' },
    { name: 'f', academicLabel: '' },
  ];
  const snapshot = structuredClone(input);
  assert.deepEqual(
    sortCommittee(input).map((m) => m.name),
    ['c', 'b', 'd', 'e', 'a', 'f'],
  );
  assert.deepEqual(input, snapshot);
});
