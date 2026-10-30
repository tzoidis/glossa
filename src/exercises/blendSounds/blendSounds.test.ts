import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import { wordGraphemes } from '../pool.ts';
import { canBlend, type BlendSoundsItem } from './generate.ts';
import { blendSounds } from './index.ts';

describe('blend-sounds property test', () => {
  it('blends only words whose sounds can be played letter by letter, with 3 distinct pictures', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(blendSounds, c);
      if (!round) continue;
      generated++;
      for (const item of round.items as BlendSoundsItem[]) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        expect(canBlend(word), `${c.label}: «${word.text}» cannot be blended`).toBe(true);
        expect(item.sounds, c.label).toEqual(wordGraphemes(word));
        expect(item.options, c.label).toHaveLength(3);
        expect(item.options, c.label).toContain(item.target);
        const images = item.options.map((id) => CONTENT.wordsById.get(id)!.imageId);
        expect(new Set(images).size, c.label).toBe(3);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('excludes words whose letters change sound together', () => {
    const byText = (t: string) => CONTENT.words.find((w) => w.text === t)!;
    expect(canBlend(byText('πατάτα'))).toBe(true);
    expect(canBlend(byText('σπίτι'))).toBe(true); // a cluster still blends
    for (const t of ['μέλισσα', 'πάπια', 'ήλιος']) expect(canBlend(byText(t)), t).toBe(false);
  });
});
