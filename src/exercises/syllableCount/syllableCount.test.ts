import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import type { SyllableCountItem } from './generate.ts';
import { syllableCount } from './index.ts';

describe('syllable-count property test', () => {
  it('asks the book syllable count, with 1-4 claps and the answer among them', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(syllableCount, c);
      if (!round) continue;
      generated++;
      for (const item of round.items as SyllableCountItem[]) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        expect(item.target, c.label).toBe(String(word.syllables.length));
        expect(item.options, c.label).toContain(item.target);
        expect(item.options.length, c.label).toBeGreaterThanOrEqual(3);
        for (const o of item.options) expect(Number(o), c.label).toBeGreaterThanOrEqual(1);
        for (const o of item.options) expect(Number(o), c.label).toBeLessThanOrEqual(4);
        if (c.level === 1) expect(item.options, c.label).toHaveLength(3);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('works in the transition period, before any letter (no text on screen)', () => {
    const c = [...cases()].find((x) => x.position === 0)!;
    expect(tryGenerate(syllableCount, c)).not.toBeNull();
  });
});
