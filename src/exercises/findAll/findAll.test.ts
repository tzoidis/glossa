import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { syllableSoundKey } from '../../engine/homophones.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import type { FindAllItem } from './generate.ts';
import { findAll } from './index.ts';

const keys = (wordId: string) => CONTENT.wordsById.get(wordId)!.syllables.map(syllableSoundKey);

describe('find-all property test', () => {
  it('every answer has the syllable, no other picture has its sound anywhere', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(findAll, c);
      if (!round) continue;
      generated++;
      const targets = new Set<string>();
      for (const [i, item] of (round.items as FindAllItem[]).entries()) {
        targets.add(item.target);
        expect(item.answers.length, c.label).toBeGreaterThanOrEqual(2);
        expect(item.options.length - item.answers.length, c.label).toBeGreaterThanOrEqual(2);
        expect(item.options.length, c.label).toBe(c.level === 1 || i < 2 || i === 4 ? 4 : 6);
        expect(new Set(item.options).size, c.label).toBe(item.options.length);
        const images = item.options.map((id) => CONTENT.wordsById.get(id)!.imageId);
        expect(new Set(images).size, c.label).toBe(images.length);
        for (const id of item.options) {
          if (item.answers.includes(id)) expect(keys(id), c.label).toContain(item.target);
          else expect(keys(id).join(''), c.label).not.toContain(item.target);
        }
      }
      expect(targets.size, c.label).toBeGreaterThan(1);
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('works in the transition period, before any letter (no text on screen)', () => {
    const c = [...cases()].find((x) => x.position === 0)!;
    expect(tryGenerate(findAll, c)).not.toBeNull();
  });
});
