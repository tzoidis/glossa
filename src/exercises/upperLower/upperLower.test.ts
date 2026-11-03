import { describe, expect, it } from 'vitest';
import greek from '../../content/greek.json' with { type: 'json' };
import { cases, tryGenerate } from '../propertyTest.ts';
import type { UpperLowerItem } from './generate.ts';
import { upperLower } from './index.ts';

describe('upper-lower property test', () => {
  it('deals each taught letter once as a capital and once as a small letter, up to 8 cards', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(upperLower, c);
      if (!round) continue;
      generated++;
      for (const item of round.items as UpperLowerItem[]) {
        expect(item.cards.length, c.label).toBe(item.pairs.length * 2);
        expect(item.cards.length, c.label).toBeLessThanOrEqual(c.level === 1 ? 6 : 8);
        expect(new Set(item.pairs).size, c.label).toBe(item.pairs.length);
        for (const g of item.pairs) {
          expect(c.ctx.allowedGraphemes.has(g), `${c.label}: «${g}»`).toBe(true);
          expect(item.cards.filter((k) => k.letter === g).map((k) => k.text).sort(), c.label).toEqual([g, g.toLocaleUpperCase('el')].sort());
        }
        if (c.level === 3) {
          const taughtDifferent = [...c.ctx.allowedGraphemes].filter((g) => greek.caseLooksDifferent.includes(g));
          // the newest letter always comes in on the first board, whatever its shape
          const newest = [...c.ctx.allowedGraphemes].filter((g) => g.length === 1).at(-1);
          if (taughtDifferent.length >= 4) for (const g of item.pairs.filter((p) => p !== newest)) expect(greek.caseLooksDifferent, c.label).toContain(g);
        }
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('starts from the third letter of unit 1', () => {
    const at = (p: number) => [...cases()].find((c) => c.position === p)!;
    expect(tryGenerate(upperLower, at(2))).toBeNull();
    expect(tryGenerate(upperLower, at(3))).not.toBeNull();
  });
});
