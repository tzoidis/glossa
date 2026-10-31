import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import type { BlendSoundsItem } from './generate.ts';
import { blendSounds } from './index.ts';

describe('blend-sounds property test', () => {
  it("plays the word's syllables, with 3 distinct pictures", () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(blendSounds, c);
      if (!round) continue;
      generated++;
      for (const item of round.items as BlendSoundsItem[]) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        expect(item.syllables, c.label).toEqual(word.syllables);
        expect(item.syllables.length, c.label).toBeGreaterThanOrEqual(2);
        expect(item.syllables.length, c.label).toBeLessThanOrEqual(5);
        expect(item.options, c.label).toHaveLength(3);
        expect(item.options, c.label).toContain(item.target);
        const images = item.options.map((id) => CONTENT.wordsById.get(id)!.imageId);
        expect(new Set(images).size, c.label).toBe(3);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('keeps to 3 syllables at level 1 when there are enough words', () => {
    for (const c of cases()) {
      if (c.level !== 1) continue;
      const round = tryGenerate(blendSounds, c);
      for (const item of (round?.items ?? []) as BlendSoundsItem[]) expect(item.syllables.length, c.label).toBeLessThanOrEqual(3);
    }
  });
});
