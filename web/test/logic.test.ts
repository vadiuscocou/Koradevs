import { describe, expect, it } from 'vitest';
import { passportHash } from '../../server/src/community/community.service.js';
import { diffLines } from '../src/diff.js';
import { canonical, verifyPassport } from '../src/verify.js';

describe('diffLines (avant / après)', () => {
  it('keeps unchanged lines and marks removed and added ones', () => {
    const ops = diffLines('a\nb\nc', 'a\nB\nc\nd');
    expect(ops).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'del', text: 'b' },
      { kind: 'add', text: 'B' },
      { kind: 'same', text: 'c' },
      { kind: 'add', text: 'd' },
    ]);
  });

  it('is empty of changes for identical text, and handles empty input', () => {
    expect(diffLines('x\ny', 'x\ny').every((o) => o.kind === 'same')).toBe(true);
    expect(diffLines('', 'a').map((o) => o.kind)).toEqual(['del', 'add']);
  });

  it('rebuilds both versions from the operations', () => {
    const before = 'one\ntwo\nthree\nfour';
    const after = 'one\n2\nthree\nfive\nsix';
    const ops = diffLines(before, after);
    expect(ops.filter((o) => o.kind !== 'add').map((o) => o.text).join('\n')).toBe(before);
    expect(ops.filter((o) => o.kind !== 'del').map((o) => o.text).join('\n')).toBe(after);
  });
});

describe('vérification du Passeport dans le navigateur', () => {
  const body = {
    login: 'awa',
    city: 'Dakar',
    country: 'Sénégal',
    tech: ['React', 'Node.js'],
    confirmedCount: 1,
    proofs: [{ id: 'p1', helper: 'awa', solutionId: 's1', title: 'Erreur « é »', tech: ['React'], testPassed: true, at: '2026-10-22T10:00:00.000Z' }],
  };

  it('uses exactly the same canonical JSON as the server', () => {
    expect(canonical({ b: 1, a: [2, { d: undefined, c: 'é' }] })).toBe('{"a":[2,{"c":"é"}],"b":1}');
  });

  it('accepts a genuine passport and rejects a modified one', async () => {
    const hash = passportHash(body);
    expect(await verifyPassport({ ...body, hash })).toBe(true);
    expect(await verifyPassport({ ...body, confirmedCount: 9, hash })).toBe(false);
    expect(await verifyPassport({ ...body, proofs: [{ ...body.proofs[0]!, testPassed: false }], hash })).toBe(false);
  });
});
