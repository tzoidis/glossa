import { describe, expect, it } from 'vitest';
import { growFactor, MAX_GROW } from './fit.ts';

describe('growFactor', () => {
  it('grows short content to fill the height, keeping a little room', () => {
    expect(growFactor(800, 1000, 16)).toBeCloseTo(1.2);
  });

  it('never shrinks below the base: the CSS base already fits', () => {
    expect(growFactor(1200, 1000, 16)).toBe(1);
    expect(growFactor(0, 1000, 16)).toBe(1);
  });

  it('stops at MAX_GROW and at the pixel cap', () => {
    expect(growFactor(100, 1000, 16)).toBe(MAX_GROW);
    expect(growFactor(100, 2000, 28)).toBeCloseTo(30 / 28);
  });
});
