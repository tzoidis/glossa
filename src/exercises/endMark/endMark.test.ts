import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { isTextAllowed, makeContext } from '../../engine/allowedWords.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import type { EndMarkItem } from './generate.ts';
import { endMark } from './index.ts';

const last = CONTENT.order.order.length;

describe('end-mark property test', () => {
  it('asks for the real last mark of a readable sentence; «!» only from unit 7', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(endMark, c);
      if (!round) continue;
      generated++;
      const allow = makeContext(CONTENT.curriculum, { position: c.position }, CONTENT.words);
      expect(allow.skills.has('question-mark'), c.label).toBe(true);
      const items = round.items as EndMarkItem[];
      expect(items, c.label).toHaveLength(5);
      expect(items.filter((i) => i.target === ';').length, c.label).toBeGreaterThanOrEqual(2);
      for (const item of items) {
        const s = CONTENT.sentences.find((x) => x.id === item.sentenceId)!;
        expect(item.target, c.label).toBe(s.tokens.at(-1));
        expect(isTextAllowed(item.full, allow), `${c.label}: «${item.full}»`).toBe(true);
        expect(item.text.endsWith(item.target), c.label).toBe(false);
        expect(item.options, c.label).toContain(item.target);
        expect(item.options.includes('!'), c.label).toBe(allow.skills.has('exclamation-mark'));
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('starts at unit 5', () => {
    const at = (p: number) => [...cases()].find((x) => x.position === p)!;
    expect(tryGenerate(endMark, at(last))).toBeNull();
    expect(tryGenerate(endMark, at(last + 1))).not.toBeNull();
  });
});
