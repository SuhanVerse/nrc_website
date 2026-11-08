import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveMembershipState } from '../../src/features/membership/state.ts';

test('only a configured open cycle with a responder destination opens membership', () => {
  for (const formUrl of [
    'https://docs.google.com/forms/d/e/abc_123/viewform?usp=sharing',
    'https://docs.google.com/forms/d/abc-123/viewform',
    'https://forms.gle/Abc123',
  ]) {
    assert.deepEqual(resolveMembershipState({ status: 'open', formUrl }), {
      status: 'open',
      formUrl,
    });
    assert.deepEqual(resolveMembershipState({ status: 'closed', formUrl }), {
      status: 'closed',
      formUrl: null,
    });
  }
});

test('missing, editor, unrelated and deceptive destinations fail closed', () => {
  const invalid = [
    null,
    '',
    'http://forms.gle/abc',
    'https://user:pass@forms.gle/abc',
    'https://forms.gle/',
    'https://forms.gle/abc/edit',
    'https://forms.gle.evil.test/abc',
    'https://docs.google.com/document/d/abc/edit',
    'https://docs.google.com/forms/d/abc/edit',
    'https://docs.google.com/forms/d/abc/responses',
    'https://docs.google.com/forms/d/e/abc/viewform/edit',
    'https://docs.google.com:8443/forms/d/abc/viewform',
    'javascript:alert(1)',
  ];
  for (const formUrl of invalid) {
    assert.deepEqual(
      resolveMembershipState({ status: 'open', formUrl }),
      { status: 'closed', formUrl: null },
      String(formUrl),
    );
  }
});
