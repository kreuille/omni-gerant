import { describe, it, expect, vi } from 'vitest';
import {
  withRetry,
  encryptCredentials,
  decryptCredentials,
} from '../connector-base.js';
import { ok, err, appError } from '@omni-gerant/shared';

describe('ConnectorBase', () => {
  describe('withRetry', () => {
    it('returns immediately on success', async () => {
      const fn = vi.fn().mockResolvedValue(ok('result'));

      const result = await withRetry(fn, 3, 10);

      expect(result.ok).toBe(true);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and succeeds', async () => {
      const fn = vi
        .fn()
        .mockResolvedValueOnce(err(appError('SERVICE_UNAVAILABLE', 'Temporary')))
        .mockResolvedValueOnce(ok('result'));

      const result = await withRetry(fn, 3, 10);

      expect(result.ok).toBe(true);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('gives up after max retries', async () => {
      const fn = vi.fn().mockResolvedValue(err(appError('SERVICE_UNAVAILABLE', 'Down')));

      const result = await withRetry(fn, 2, 10);

      expect(result.ok).toBe(false);
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('does not retry on UNAUTHORIZED', async () => {
      const fn = vi.fn().mockResolvedValue(err(appError('UNAUTHORIZED', 'Bad creds')));

      const result = await withRetry(fn, 3, 10);

      expect(result.ok).toBe(false);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('does not retry on VALIDATION_ERROR', async () => {
      const fn = vi.fn().mockResolvedValue(err(appError('VALIDATION_ERROR', 'Bad input')));

      const result = await withRetry(fn, 3, 10);

      expect(result.ok).toBe(false);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('encryptCredentials / decryptCredentials', () => {
    it('encrypts and decrypts credentials roundtrip', async () => {
      const key = crypto.getRandomValues(new Uint8Array(32));
      const original = JSON.stringify({ username: 'user', password: 'secret123' });

      const encrypted = await encryptCredentials(original, key);
      expect(encrypted.encrypted).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();

      const decrypted = await decryptCredentials(encrypted, key);
      expect(decrypted).toBe(original);
    });

    it('produces different ciphertext each time (random IV)', async () => {
      const key = crypto.getRandomValues(new Uint8Array(32));
      const data = 'test data';

      const enc1 = await encryptCredentials(data, key);
      const enc2 = await encryptCredentials(data, key);

      expect(enc1.encrypted).not.toBe(enc2.encrypted);
      expect(enc1.iv).not.toBe(enc2.iv);
    });

    it('fails to decrypt with wrong key', async () => {
      const key1 = crypto.getRandomValues(new Uint8Array(32));
      const key2 = crypto.getRandomValues(new Uint8Array(32));

      const encrypted = await encryptCredentials('secret', key1);

      await expect(decryptCredentials(encrypted, key2)).rejects.toThrow();
    });
  });
});
