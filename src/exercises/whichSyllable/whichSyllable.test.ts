import { describe, expect, it } from 'vitest';
import { graphemes } from '../../engine/greekTokenizer.ts';
import { syllableSoundKey } from '../../engine/homophones.ts';
import { detectFlags } from '../../engine/pronunciationFlags.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import type { WhichSyllableItem } from './generate.ts';
import { whichSyllable } from './index.ts';

describe('which-syllable property test', () => {
  it('only shows syllables of taught letters, never two that sound the same', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(whichSyllable, c);
      if (!round) continue;
      generated++;
      const items = round.items as WhichSyllableItem[];
      expect(items, c.label).toHaveLength(5);
      items.forEach((item, i) => {
        if (i > 0) expect(item.target, `${c.label}: same syllable twice in a row`).not.toBe(items[i - 1]!.target);
        expect(item.options, c.label).toContain(item.target);
        expect(item.options.length, c.label).toBeGreaterThanOrEqual(3);
        expect(new Set(item.options.map(syllableSoundKey)).size, `${c.label}: two choices sound the same`).toBe(item.options.length);
        for (const s of item.options) {
          for (const g of graphemes(s)) expect(c.ctx.allowedGraphemes.has(g), `${c.label}: «${g}» in «${s}» not taught`).toBe(true);
          for (const f of detectFlags(s)) expect(c.ctx.unlockedFlags.has(f), `${c.label}: «${s}» needs ${f}`).toBe(true);
        }
      });
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('starts once the taught letters make three syllables (α, ν, ι → α, ι, να, νι)', () => {
    const at = (p: number) => [...cases()].find((c) => c.position === p)!;
    expect(tryGenerate(whichSyllable, at(1))).toBeNull();
    expect(tryGenerate(whichSyllable, at(3))).not.toBeNull();
  });
});
