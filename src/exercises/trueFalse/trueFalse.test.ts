import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { isTextAllowed, makeContext } from '../../engine/allowedWords.ts';
import { pictureUrl } from '../../ui/Picture.tsx';
import { cases, tryGenerate } from '../propertyTest.ts';
import { NO, sentenceText, YES, type TrueFalseItem } from './generate.ts';
import { trueFalse } from './index.ts';

describe('true-false property test', () => {
  it('shows only readable sentences, both answers, no sentence twice', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(trueFalse, c);
      if (!round) continue;
      generated++;
      const allow = makeContext(CONTENT.curriculum, { position: c.position }, CONTENT.words);
      const items = round.items as TrueFalseItem[];
      expect(items, c.label).toHaveLength(5);
      for (const item of items) {
        const s = CONTENT.sentences.find((x) => x.id === item.sentenceId)!;
        expect(isTextAllowed(item.text, allow), `${c.label}: «${item.text}» not readable`).toBe(true);
        expect(item.target, c.label).toBe(s.isTrueForImage ? YES : NO);
        expect(item.imageId, c.label).toBe(s.imageId);
      }
      expect(items.filter((i) => i.target === YES).length, c.label).toBeGreaterThanOrEqual(2);
      expect(items.filter((i) => i.target === NO).length, c.label).toBeGreaterThanOrEqual(2);
      expect(new Set(items.map((i) => i.text)).size, c.label).toBe(5);
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('is offered by the end of unit 2', () => {
    const at = (position: number) => [...cases()].find((c) => c.position === position)!;
    expect(tryGenerate(trueFalse, at(18))).not.toBeNull();
  });
});

describe('sentences', () => {
  it('read as written: capital first, a mark at the end', () => {
    expect(sentenceText({ id: 'x', tokens: ['Το', 'πουλί', 'πετά', '.'] })).toBe('Το πουλί πετά.');
    for (const s of CONTENT.sentences) {
      const text = sentenceText(s);
      // a capital, accent or not («Έλα»)
      expect(text[0], s.id).not.toBe(text[0]!.toLocaleLowerCase('el'));
      expect(text, s.id).toMatch(/[.!;]$/);
    }
  });

  it('with a picture: a bundled one and a truth value; without: a question, an exclamation or a plain statement', () => {
    for (const s of CONTENT.sentences) {
      if (s.imageId) {
        expect(pictureUrl(s.imageId), s.id).toBeDefined();
        expect(typeof s.isTrueForImage, s.id).toBe('boolean');
      } else {
        expect(s.isTrueForImage, s.id).toBeUndefined();
      }
    }
  });
});
