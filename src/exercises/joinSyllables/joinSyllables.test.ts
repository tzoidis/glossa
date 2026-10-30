import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { graphemes } from '../../engine/greekTokenizer.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import { isReadable } from '../pool.ts';
import type { JoinSyllablesItem } from './generate.ts';
import { joinSyllables } from './index.ts';

describe('join-syllables property test', () => {
  it('only puts allowed words and taught letters on screen', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(joinSyllables, c);
      if (!round) continue;
      generated++;
      const items = round.items as JoinSyllablesItem[];
      expect(items, c.label).toHaveLength(5);
      for (const item of items) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        expect(isReadable(word, c.ctx), `${c.label}: «${word.text}» not allowed`).toBe(true);
        expect(item.syllables.join(''), c.label).toBe(item.text);
        for (const tile of item.tiles) {
          for (const g of graphemes(tile.text)) expect(c.ctx.allowedGraphemes.has(g), `${c.label}: tile «${tile.text}»`).toBe(true);
        }
        const extra = item.tiles.length - item.syllables.length;
        expect(extra, c.label).toBe(c.level === 3 ? extra : 0);
        expect(extra, c.label).toBeLessThanOrEqual(1);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('is hidden until unit 1 has enough readable words, then available', () => {
    const at = (p: number) => [...cases()].find((c) => c.position === p)!;
    expect(tryGenerate(joinSyllables, at(3))).toBeNull();
    expect(tryGenerate(joinSyllables, at(9))).not.toBeNull();
  });

  it('never deals the tiles already in order', () => {
    for (const c of cases()) {
      const round = tryGenerate(joinSyllables, c);
      for (const item of (round?.items ?? []) as JoinSyllablesItem[]) {
        expect(item.tiles.map((t) => t.text).join('|'), c.label).not.toBe(item.syllables.join('|'));
      }
    }
  });
});
