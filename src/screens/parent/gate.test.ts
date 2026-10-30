import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../engine/rng.ts';
import { gatePasses, isValidPin, makeGateQuestion } from './gate.ts';

describe('parent gate', () => {
  it('asks a two-digit × one-digit product a child cannot guess', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const q = makeGateQuestion(rng);
      expect(q.a).toBeGreaterThanOrEqual(12);
      expect(q.a).toBeLessThanOrEqual(29);
      expect(q.b).toBeGreaterThanOrEqual(3);
      expect(q.b).toBeLessThanOrEqual(9);
      expect(q.answer).toBe(q.a * q.b);
    }
  });

  it('accepts the product, or only the PIN once one is set', () => {
    const q = { a: 17, b: 6, answer: 102 };
    expect(gatePasses('102', q, null)).toBe(true);
    expect(gatePasses(' 102 ', q, null)).toBe(true);
    expect(gatePasses('', q, null)).toBe(false);
    expect(gatePasses('101', q, null)).toBe(false);
    expect(gatePasses('102', q, '4321')).toBe(false);
    expect(gatePasses('4321', q, '4321')).toBe(true);
  });

  it('validates PINs', () => {
    expect(isValidPin('0123')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });
});
