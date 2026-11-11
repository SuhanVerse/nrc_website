import assert from 'node:assert/strict';
import test from 'node:test';
import { sortCommittee } from '../../src/features/committee/order.ts';

test('office positions lead in role order even when an ordinary member has a senior batch', () => {
  const input = [
    { name: 'Arushi', academicLabel: 'BEI 079', role: 'Member' },
    { name: 'Sudikshya', academicLabel: 'BCT 079', role: 'Event Manager' },
    { name: 'Suhan', academicLabel: 'BCT 080', role: 'Treasurer' },
    { name: 'Bishal', academicLabel: 'BCT 079', role: 'R&D Head' },
    { name: 'Pratham', academicLabel: 'BEI 080', role: 'Secretary' },
    { name: 'Prabhat', academicLabel: 'BCT 082', role: 'President' },
  ];
  const snapshot = structuredClone(input);
  assert.deepEqual(
    sortCommittee(input).map((member) => member.name),
    ['Prabhat', 'Bishal', 'Pratham', 'Suhan', 'Sudikshya', 'Arushi'],
  );
  assert.deepEqual(input, snapshot);
});

test('ordinary members follow senior batches and alphabetical names within each year across departments', () => {
  const input = [
    { name: 'Samarpan', academicLabel: 'BCT 082', role: 'Member' },
    { name: 'Shrawan', academicLabel: 'BEI 080', role: 'Member' },
    { name: 'Arushi', academicLabel: 'BEI 080', role: 'Member' },
    { name: 'Sarad', academicLabel: 'BEI 081', role: 'Member' },
    { name: 'Rhythm', academicLabel: 'BEI 081', role: 'Member' },
    { name: 'Pranish', academicLabel: 'BEI 082', role: 'Member' },
    { name: 'pravin', academicLabel: 'BEI 082', role: 'Member' },
  ];
  const snapshot = structuredClone(input);
  assert.deepEqual(
    sortCommittee(input).map((member) => member.name),
    ['Arushi', 'Shrawan', 'Rhythm', 'Sarad', 'Pranish', 'pravin', 'Samarpan'],
  );
  assert.deepEqual(input, snapshot);
});

test('unknown positions precede ordinary members with deterministic batch and name ties', () => {
  const input = [
    { name: 'Zoya', academicLabel: 'BCT 079', role: 'Member' },
    { name: 'Zain', academicLabel: 'BCT 082', role: 'Advisor' },
    { name: 'Anita', academicLabel: 'BEI 082', role: 'Coordinator' },
    { name: 'Sarad', academicLabel: 'BEI 081', role: 'Advisor' },
    { name: 'Bishal', academicLabel: 'BCT 079', role: 'R&D Head' },
  ];
  assert.deepEqual(
    sortCommittee(input).map((member) => member.name),
    ['Bishal', 'Sarad', 'Anita', 'Zain', 'Zoya'],
  );
});

test('unassigned ordinary-member batches follow known batches with alphabetical names', () => {
  const input = [
    { name: 'Zoya', academicLabel: '', role: 'Member' },
    { name: 'Sarad', academicLabel: 'BEI 081', role: 'Member' },
    { name: 'Anita', academicLabel: 'Unassigned', role: 'Member' },
  ];
  assert.deepEqual(
    sortCommittee(input).map((member) => member.name),
    ['Sarad', 'Anita', 'Zoya'],
  );
});
