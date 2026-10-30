import { describe, expect, it } from 'vitest';
import { soundsSame } from '../../engine/homophones.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import type { WhichLetterItem } from './generate.ts';
import { whichLetter } from './index.ts';

describe('which-letter property test', () => {
  it('only shows taught letters and never a letter that sounds like the answer', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(whichLetter, c);
      if (!round) continue;
      generated++;
      const items = round.items as WhichLetterItem[];
      expect(items, c.label).toHaveLength(5);
      items.forEach((item, i) => {
        if (i > 0) expect(item.target, `${c.label}: same letter twice in a row`).not.toBe(items[i - 1]!.target);
        expect(item.options, c.label).toContain(item.target);
        for (const g of item.options) {
          expect(c.ctx.allowedGraphemes.has(g), `${c.label}: «${g}» not taught`).toBe(true);
          if (g !== item.target) expect(soundsSame(g, item.target), `${c.label}: «${g}» sounds like «${item.target}»`).toBe(false);
        }
      });
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('needs at least two letters that sound different', () => {
    const at = (p: number) => [...cases()].find((c) => c.position === p)!;
    expect(tryGenerate(whichLetter, at(1))).toBeNull();
    expect(tryGenerate(whichLetter, at(2))).not.toBeNull();
  });
});
