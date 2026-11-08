import assert from 'node:assert/strict';
import test from 'node:test';
import { withBase } from '../../src/components/paths.ts';

test('internal routes and assets respect root and repository hosting', () => {
  assert.equal(withBase('/team/', '/website/'), '/website/team/');
  assert.equal(withBase('/team/', '/'), '/team/');
  assert.equal(withBase('/', '/website'), '/website/');
  assert.equal(
    withBase('/images/robot.webp', '/website/'),
    '/website/images/robot.webp',
  );
});

test('external or ambiguous paths cannot become internal links', () => {
  for (const path of [
    'https://example.com',
    '//example.com',
    'team/',
    '/a/../b',
    '/\\evil',
  ]) {
    assert.throws(() => withBase(path, '/website/'));
  }
  for (const base of ['https://example.com', '//example.com/', '/a/../']) {
    assert.throws(() => withBase('/team/', base));
  }
});
