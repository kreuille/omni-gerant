import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, unwrap, unwrapOr, map, mapErr, flatMap } from '../result.js';
import type { AppError } from '../errors.js';

describe('Result pattern', () => {
  describe('ok()', () => {
    it('creates a successful result', () => {
      const result = ok(42);
      expect(result).toEqual({ ok: true, value: 42 });
    });

    it('works with complex types', () => {
      const result = ok({ name: 'test', items: [1, 2, 3] });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('test');
      }
    });

    it('works with null and undefined', () => {
      expect(ok(null)).toEqual({ ok: true, value: null });
      expect(ok(undefined)).toEqual({ ok: true, value: undefined });
    });
  });

  describe('err()', () => {
    it('creates an error result', () => {
      const error: AppError = { code: 'NOT_FOUND', message: 'Not found' };
      const result = err(error);
      expect(result).toEqual({ ok: false, error });
    });
  });

  describe('isOk() / isErr()', () => {
    it('correctly identifies ok results', () => {
      expect(isOk(ok(1))).toBe(true);
      expect(isOk(err({ code: 'NOT_FOUND' as const, message: '' }))).toBe(false);
    });

    it('correctly identifies err results', () => {
      expect(isErr(err({ code: 'NOT_FOUND' as const, message: '' }))).toBe(true);
      expect(isErr(ok(1))).toBe(false);
    });
  });

  describe('unwrap()', () => {
    it('returns value for ok result', () => {
      expect(unwrap(ok(42))).toBe(42);
    });

    it('throws for err result', () => {
      const result = err({ code: 'NOT_FOUND' as const, message: 'oops' });
      expect(() => unwrap(result)).toThrow('Attempted to unwrap an error Result');
    });
  });

  describe('unwrapOr()', () => {
    it('returns value for ok result', () => {
      expect(unwrapOr(ok(42), 0)).toBe(42);
    });

    it('returns default for err result', () => {
      const result = err({ code: 'NOT_FOUND' as const, message: 'oops' });
      expect(unwrapOr(result, 0)).toBe(0);
    });
  });

  describe('map()', () => {
    it('transforms ok value', () => {
      const result = map(ok(5), (v) => v * 2);
      expect(result).toEqual({ ok: true, value: 10 });
    });

    it('passes through err', () => {
      const error: AppError = { code: 'NOT_FOUND', message: '' };
      const result = map(err(error), (v: number) => v * 2);
      expect(result).toEqual({ ok: false, error });
    });
  });

  describe('mapErr()', () => {
    it('transforms error', () => {
      const result = mapErr(
        err({ code: 'NOT_FOUND' as const, message: 'original' }),
        (e) => ({ ...e, message: 'mapped' }),
      );
      if (!result.ok) {
        expect(result.error.message).toBe('mapped');
      }
    });

    it('passes through ok', () => {
      const result = mapErr(ok(42), () => ({ code: 'INTERNAL_ERROR' as const, message: '' }));
      expect(result).toEqual({ ok: true, value: 42 });
    });
  });

  describe('flatMap()', () => {
    it('chains ok results', () => {
      const result = flatMap(ok(5), (v) => ok(v * 2));
      expect(result).toEqual({ ok: true, value: 10 });
    });

    it('short-circuits on err', () => {
      const error: AppError = { code: 'NOT_FOUND', message: '' };
      const result = flatMap(err(error), (v: number) => ok(v * 2));
      expect(result).toEqual({ ok: false, error });
    });

    it('returns err from fn', () => {
      const error: AppError = { code: 'VALIDATION_ERROR', message: 'too small' };
      const result = flatMap(ok(5), (_v) => err(error));
      expect(result).toEqual({ ok: false, error });
    });
  });
});
