import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { graphemes } from '../../engine/greekTokenizer.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import { isReadable } from '../pool.ts';
import type { OrderItem } from '../shared/OrderExercise.tsx';
import { buildWord } from './index.ts';

describe('build-word property test', () => {
  it('shows only allowed words and taught letters; tiles spell the word', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(buildWord, c);
      if (!round) continue;
      generated++;
      for (const item of round.items as OrderItem[]) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        expect(isReadable(word, c.ctx), `${c.label}: «${word.text}» not allowed`).toBe(true);
        expect(item.parts.join(''), c.label).toBe(item.text.toLocaleLowerCase('el'));
        for (const tile of item.tiles) {
          const gs = graphemes(tile.text);
          expect(gs, `${c.label}: tile «${tile.text}» is one grapheme`).toHaveLength(1);
          expect(c.ctx.allowedGraphemes.has(gs[0]!), `${c.label}: tile «${tile.text}» not taught`).toBe(true);
        }
        expect(item.tiles.length - item.parts.length, c.label).toBeLessThanOrEqual(c.level === 3 ? 1 : 0);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('keeps level 1 to short words when there are enough', () => {
    const c = [...cases()].find((x) => x.position === 18 && x.level === 1)!;
    for (const item of tryGenerate(buildWord, c)!.items as OrderItem[]) expect(item.parts.length).toBeLessThanOrEqual(4);
  });
});
