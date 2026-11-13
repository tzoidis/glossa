import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { wordsSoundSame } from '../../engine/homophones.ts';
import { isTextAllowed, makeContext } from '../../engine/allowedWords.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import { misspeltEnding, type SpellingItem } from './generate.ts';
import { spelling } from './index.ts';

describe('misspeltEnding', () => {
  it('swaps the final vowel for the one that sounds the same', () => {
    expect(misspeltEnding('μύτη')).toBe('μύτι');
    expect(misspeltEnding('μάτι')).toBe('μάτη');
    expect(misspeltEnding('λύκος')).toBe('λύκως');
    expect(misspeltEnding('νησί')).toBe('νησή');
    expect(misspeltEnding('μήλο')).toBe('μήλω');
    expect(misspeltEnding('γάτα')).toBeNull();
    expect(misspeltEnding('αλεπού')).toBeNull();
  });
});

describe('spelling property test', () => {
  it('offers the right spelling and one that sounds the same, all readable', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(spelling, c);
      if (!round) continue;
      generated++;
      const allow = makeContext(CONTENT.curriculum, { position: c.position }, CONTENT.words);
      for (const item of round.items as SpellingItem[]) {
        expect(item.options, c.label).toHaveLength(2);
        expect(item.options, c.label).toContain(item.target);
        const wrong = item.options.find((o) => o !== item.target)!;
        expect(wordsSoundSame(wrong, item.target), `${c.label}: ${wrong} / ${item.target}`).toBe(true);
        expect(isTextAllowed(`${item.lead} ${item.target}`, allow), `${c.label}: «${item.lead} ${item.target}»`).toBe(true);
        if (item.wordId) expect(CONTENT.wordsById.get(item.wordId)!.article, c.label).toBe(item.lead);
        if (c.level === 1) expect(item.wordId, c.label).toBeDefined();
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('brings verbs in from level 2', () => {
    const c = [...cases()].find((x) => x.position === CONTENT.order.maxPosition && x.level === 2)!;
    const items = tryGenerate(spelling, c)!.items as SpellingItem[];
    expect(items.filter((i) => !i.wordId).length).toBeGreaterThan(0);
  });
});
