import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import { isReadable } from '../pool.ts';
import type { WordPictureItem } from './generate.ts';
import { wordPicture } from './index.ts';

describe('word-picture property test', () => {
  it('shows only allowed words; pictures are distinct and include the answer', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(wordPicture, c);
      if (!round) continue;
      generated++;
      for (const item of round.items as WordPictureItem[]) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        expect(isReadable(word, c.ctx), `${c.label}: «${word.text}» not allowed`).toBe(true);
        expect(item.options, c.label).toContain(item.target);
        const images = item.options.map((id) => CONTENT.wordsById.get(id)!.imageId);
        expect(new Set(images).size, c.label).toBe(item.options.length);
        expect(item.options.length, c.label).toBeLessThanOrEqual(c.level === 1 ? 3 : 4);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });
});
