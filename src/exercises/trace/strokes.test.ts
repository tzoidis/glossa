import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { checkStroke, lettersWithStrokes, resample, samplePath, strokesOf, type Point } from './strokes.ts';

// a finger wobbles slowly, at an even pace: 60 touch points with a gentle drift
const jitter = (points: Point[], amount: number) =>
  resample(points, 60).map((p, k) => ({ x: p.x + Math.sin(k / 6) * amount, y: p.y + Math.cos(k / 9) * amount }));

describe('strokes.json', () => {
  it('has every single letter of the curriculum, small and capital', () => {
    const letters = CONTENT.order.order.filter((g) => [...g].length === 1);
    for (const g of [...letters, 'ς']) expect(strokesOf(g, 'lower'), g).toBeDefined();
    for (const g of letters) expect(strokesOf(g.toLocaleUpperCase('el'), 'upper'), g).toBeDefined();
  });

  it('keeps every stroke inside the box, for both hands', () => {
    for (const [c, left] of [['lower', false], ['upper', false], ['lower', true], ['upper', true]] as const) {
      for (const g of lettersWithStrokes(c)) {
        for (const d of strokesOf(g, c, left)!) {
          for (const p of samplePath(d)) {
            expect(p.x, `${g} ${d}`).toBeGreaterThanOrEqual(0);
            expect(p.x, `${g} ${d}`).toBeLessThanOrEqual(100);
            expect(p.y, `${g} ${d}`).toBeGreaterThanOrEqual(0);
            expect(p.y, `${g} ${d}`).toBeLessThanOrEqual(100);
          }
        }
      }
    }
  });
});

describe('left-handed sheet', () => {
  it('draws lines right to left where the sheet says so, and keeps the rest', () => {
    expect(strokesOf('Γ', 'upper', true)).toEqual(['M 72 15 L 30 15', 'M 30 15 L 30 85']);
    expect(strokesOf('Γ', 'upper', false)).toEqual(['M 30 15 L 30 85', 'M 30 15 L 72 15']);
    expect(strokesOf('ο', 'lower', true)).toEqual(strokesOf('ο', 'lower', false));
  });

  it('only overrides letters the right-handed sheet has, with the same number of strokes', () => {
    for (const c of ['lower', 'upper'] as const) {
      for (const g of lettersWithStrokes(c)) expect(strokesOf(g, c, true)!.length, g).toBe(strokesOf(g, c)!.length);
    }
  });
});

describe('checkStroke', () => {
  it('passes every model stroke traced a little unsteadily, in the right way', () => {
    for (const [c, left] of [['lower', false], ['upper', false], ['lower', true], ['upper', true]] as const) {
      for (const g of lettersWithStrokes(c)) {
        for (const d of strokesOf(g, c, left)!) {
          const model = samplePath(d);
          expect(checkStroke(jitter(model, 3), model, 12), `${g} ${d}`).toBe('ok');
        }
      }
    }
  });

  it('fails a stroke drawn the other way, open or closed', () => {
    const line = samplePath('M 50 15 L 50 85');
    expect(checkStroke([...line].reverse(), line, 12)).toBe('direction');
    const circle = samplePath(strokesOf('ο', 'lower')![0]!);
    const clockwise = samplePath('M 50 36 C 70 36 70 70 50 70 C 30 70 30 36 50 36');
    expect(checkStroke(clockwise, circle, 12)).toBe('direction');
    expect(checkStroke(circle, circle, 12)).toBe('ok');
  });

  it('fails a short scribble, a far start and a wrong shape', () => {
    const line = samplePath('M 30 15 L 30 85');
    expect(checkStroke(samplePath('M 30 15 L 30 30'), line, 12)).toBe('short');
    expect(checkStroke(samplePath('M 30 45 L 30 115'), line, 12)).toBe('start');
    expect(checkStroke(samplePath('M 30 15 L 80 85'), line, 12)).toBe('shape');
  });
});
