import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { isTextAllowed, makeContext } from '../../engine/allowedWords.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import { isReadable } from '../pool.ts';
import { DIGRAPHS, LABELS, marksOf, ONE, TWO, type DigraphItem } from './generate.ts';
import { digraph } from './index.ts';

const word = (id: string) => CONTENT.wordsById.get(id)!;

describe('marksOf', () => {
  it('finds digraphs anywhere and clusters only at the start of a syllable', () => {
    expect(marksOf(word('banana')).map((m) => [m.pair, m.kind])).toEqual([['μπ', ONE]]);
    expect(marksOf(word('house')).map((m) => [m.before, m.pair, m.after, m.kind])).toEqual([['', 'σπ', 'ίτι', TWO]]);
    expect(marksOf(word('cactus')).map((m) => [m.pair, m.kind])).toEqual([['κτ', TWO]]);
    // the whole cluster: κά-στρο
    expect(marksOf(word('castle')).map((m) => [m.pair, m.kind])).toEqual([['στρ', TWO]]);
    // πόρ-τα: ρ and τ are in different syllables
    expect(marksOf(word('door'))).toEqual([]);
  });
});

describe('digraph property test', () => {
  it('marks a real digraph or cluster in a readable word, both answers in every round', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(digraph, c);
      if (!round) continue;
      generated++;
      const allow = makeContext(CONTENT.curriculum, { position: c.position }, CONTENT.words);
      const items = round.items as DigraphItem[];
      expect(items, c.label).toHaveLength(5);
      for (const item of items) {
        expect(isReadable(word(item.wordId), c.ctx), `${c.label}: «${item.text}»`).toBe(true);
        expect((item.before + item.pair + item.after).toLocaleLowerCase('el'), c.label).toBe(item.text.toLocaleLowerCase('el'));
        expect([...item.pair].length, c.label).toBeGreaterThanOrEqual(2);
        if (item.target === ONE) expect(DIGRAPHS.has(item.pair.normalize('NFD').replace(/\p{M}/gu, '')), c.label).toBe(true);
        for (const o of item.options) expect(isTextAllowed(LABELS[o](), allow), `${c.label}: «${LABELS[o]()}»`).toBe(true);
      }
      expect(items.filter((i) => i.target === ONE).length, c.label).toBeGreaterThanOrEqual(2);
      expect(items.filter((i) => i.target === TWO).length, c.label).toBeGreaterThanOrEqual(2);
    }
    expect(generated).toBeGreaterThan(0);
  });
});
