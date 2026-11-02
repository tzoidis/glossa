import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { isWordAllowed, makeContext } from '../../engine/allowedWords.ts';
import { soundsSame } from '../../engine/homophones.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import type { MissingLetterItem } from './generate.ts';
import { missingLetter } from './index.ts';

describe('missing-letter property test', () => {
  it('shows only readable words and taught letters, never a homophone of the missing one', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(missingLetter, c);
      if (!round) continue;
      generated++;
      const allow = makeContext(CONTENT.curriculum, { position: c.position }, CONTENT.words);
      for (const item of round.items as MissingLetterItem[]) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        expect(isWordAllowed(word.text, allow), `${c.label}: «${word.text}» not readable`).toBe(true);
        expect(item.parts.join(''), c.label).toBe(word.text);
        expect(item.parts[item.gap], c.label).toBe(item.target);
        expect(item.options, c.label).toContain(item.target);
        expect(new Set(item.options).size, c.label).toBe(item.options.length);
        expect(item.options.length, c.label).toBeGreaterThanOrEqual(3);
        expect(item.options.length, c.label).toBeLessThanOrEqual(c.level === 1 ? 3 : 4);
        for (const g of item.options) {
          expect(c.ctx.allowedGraphemes.has(g), `${c.label}: «${g}» not taught`).toBe(true);
          if (g !== item.target) expect(soundsSame(g, item.target), `${c.label}: «${g}» sounds like «${item.target}»`).toBe(false);
        }
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('waits for readable words, then is offered', () => {
    const at = (p: number) => [...cases()].find((c) => c.position === p)!;
    expect(tryGenerate(missingLetter, at(3))).toBeNull();
    expect(tryGenerate(missingLetter, at(9))).not.toBeNull();
  });
});
