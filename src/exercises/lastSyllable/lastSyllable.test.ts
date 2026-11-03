import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { graphemes } from '../../engine/greekTokenizer.ts';
import { syllableSoundKey } from '../../engine/homophones.ts';
import { detectFlags } from '../../engine/pronunciationFlags.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import { hasAccent, withoutAccent } from '../stress/generate.ts';
import type { LastSyllableItem } from './generate.ts';
import { lastSyllable } from './index.ts';

describe('last-syllable property test', () => {
  it('asks for the real last syllable among taught, unaccented, different-sounding ones', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(lastSyllable, c);
      if (!round) continue;
      generated++;
      for (const item of round.items as LastSyllableItem[]) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        expect(item.target, c.label).toBe(withoutAccent(word.syllables.at(-1)!.toLocaleLowerCase('el')));
        expect(item.options, c.label).toContain(item.target);
        expect(new Set(item.options.map(syllableSoundKey)).size, `${c.label}: ${item.options}`).toBe(item.options.length);
        for (const s of item.options) {
          expect(hasAccent(s), c.label).toBe(false);
          for (const g of graphemes(s)) expect(c.ctx.allowedGraphemes.has(g), `${c.label}: «${s}»`).toBe(true);
          for (const f of detectFlags(s)) expect(c.ctx.unlockedFlags.has(f), `${c.label}: «${s}» ${f}`).toBe(true);
        }
        expect(item.options.length, c.label).toBeLessThanOrEqual(c.level === 1 ? 3 : 4);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });
});
