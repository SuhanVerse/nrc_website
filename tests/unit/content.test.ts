import assert from 'node:assert/strict';
import test from 'node:test';
import { club, validatePublicContent } from '../../src/content/public.ts';
import { sortCommittee } from '../../src/features/committee/order.ts';

test('approved public records preserve membership, contacts and committee order', () => {
  assert.equal(club.members.length, 13);
  assert.equal(club.projects.length, 3);
  assert.deepEqual(club.membership, { status: 'closed', formUrl: null });
  assert.deepEqual(club.upcomingEvents, []);
  assert.equal(club.club.email, 'nceofficialroboticsclub@gmail.com');
  assert.deepEqual(
    sortCommittee(club.members)
      .slice(0, 3)
      .map((m) => m.name),
    ['Prabhat Rawal', 'Bishal Gyawalli', 'Sudhikashya Tako'],
  );
  const suhan = club.members.find((m) => m.slug === 'suhan-khadka');
  assert.equal(suhan?.role, 'Treasurer');
  assert.equal(suhan?.academicLabel, 'BCT 080');
});

test('private or malformed records are rejected before building', () => {
  for (const mutate of [
    (d: any) => (d.privateLoans = []),
    (d: any) => (d.members[0].permissions = ['admin']),
    (d: any) => (d.members[0].portrait = '/private/photo.jpg'),
    (d: any) => (d.members[0].socials[0].url = 'javascript:alert(1)'),
    (d: any) => d.members.push(d.members[0]),
    (d: any) => (d.projects[0].url = 'https://user:password@example.com/'),
  ]) {
    const copy = structuredClone(club);
    mutate(copy);
    assert.throws(() => validatePublicContent(copy));
  }
});
