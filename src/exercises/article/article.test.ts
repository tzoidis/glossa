import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { isTextAllowed, makeContext } from '../../engine/allowedWords.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import { isReadable } from '../pool.ts';
import { articleByEnding, ARTICLES, type ArticleItem } from './generate.ts';
import { article } from './index.ts';

describe('article property test', () => {
  it('shows readable words with their own article among ο, η, το', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(article, c);
      if (!round) continue;
      generated++;
      const allow = makeContext(CONTENT.curriculum, { position: c.position }, CONTENT.words);
      for (const item of round.items as ArticleItem[]) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        expect(isReadable(word, c.ctx), `${c.label}: «${word.text}»`).toBe(true);
        expect(item.target, c.label).toBe(word.article);
        expect(item.options, c.label).toEqual([...ARTICLES]);
        for (const a of item.options) expect(isTextAllowed(a, allow), `${c.label}: «${a}»`).toBe(true);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('level 1 keeps to words whose ending gives the article', () => {
    for (const c of cases()) {
      if (c.level !== 1) continue;
      const round = tryGenerate(article, c);
      for (const item of (round?.items ?? []) as ArticleItem[]) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        const regular = CONTENT.words.filter((w) => w.imageId && isReadable(w, c.ctx) && articleByEnding(w.text) === w.article);
        if (regular.length >= 3) expect(articleByEnding(word.text), `${c.label}: «${word.text}»`).toBe(word.article);
      }
    }
  });

  it('reads the article off the ending', () => {
    expect(articleByEnding('γάτα')).toBe('η');
    expect(articleByEnding('τόπι')).toBe('το');
    expect(articleByEnding('λύκος')).toBe('ο');
    expect(articleByEnding('ανανάς')).toBe('ο');
    expect(articleByEnding('αλεπού')).toBeNull();
  });
});
