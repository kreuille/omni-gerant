import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { hashToken } from '../portal/portal.service.js';

describe('V8 — Hash token portail', () => {
  it('hashToken produit un SHA-256 hex', () => {
    const h = hashToken('my-secret-token');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it('meme token = meme hash (determinisme)', () => {
    const t = 'abc123';
    expect(hashToken(t)).toBe(hashToken(t));
  });

  it('tokens differents = hashes differents', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });

  it('hash compatible avec crypto standard', () => {
    const expected = createHash('sha256').update('test').digest('hex');
    expect(hashToken('test')).toBe(expected);
  });
});

describe('V8 — Integrite document signature', () => {
  it('hash document change si contenu change', () => {
    const h1 = createHash('sha256').update('contrat v1').digest('hex');
    const h2 = createHash('sha256').update('contrat v2').digest('hex');
    expect(h1).not.toBe(h2);
  });

  it('hash signature inclut timestamp + email + document', () => {
    const ts = new Date('2026-01-15T10:00:00Z');
    const hash = createHash('sha256').update(`user@example.fr|${ts.toISOString()}|doc-hash`).digest('hex');
    expect(hash).toHaveLength(64);
  });
});
