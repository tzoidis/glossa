import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import { isReadable } from '../pool.ts';
import { hasAccent, withoutAccent, type StressItem } from './generate.ts';
import { stress } from './index.ts';

describe('stress property test', () => {
  it('shows readable words of 2+ syllables, unaccented, with the stressed one as answer', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(stress, c);
      if (!round) continue;
      generated++;
      for (const item of round.items as StressItem[]) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        expect(isReadable(word, c.ctx), `${c.label}: «${word.text}»`).toBe(true);
        expect(item.syllables.length, c.label).toBeGreaterThanOrEqual(2);
        expect(item.bare.some(hasAccent), c.label).toBe(false);
        expect(hasAccent(item.syllables[Number(item.target)]!), c.label).toBe(true);
        expect(item.bare.join(''), c.label).toBe(withoutAccent(word.text.toLocaleLowerCase('el')));
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('strips only the accent', () => {
    expect(withoutAccent('τά')).toBe('τα');
    expect(withoutAccent('ρο')).toBe('ρο');
    expect(hasAccent('λό')).toBe(true);
  });
});
