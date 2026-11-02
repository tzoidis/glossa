import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { isWordAllowed, makeContext } from '../../engine/allowedWords.ts';
import { wordsSoundSame } from '../../engine/homophones.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import type { WhichWordItem } from './generate.ts';
import { whichWord } from './index.ts';

describe('which-word property test', () => {
  it('shows only readable words, the heard one among them, none sounding alike', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(whichWord, c);
      if (!round) continue;
      generated++;
      const allow = makeContext(CONTENT.curriculum, { position: c.position }, CONTENT.words);
      for (const item of round.items as WhichWordItem[]) {
        expect(item.options, c.label).toContain(item.target);
        expect(new Set(item.options).size, c.label).toBe(item.options.length);
        expect(item.options.length, c.label).toBeGreaterThanOrEqual(3);
        expect(item.options.length, c.label).toBeLessThanOrEqual(c.level === 1 ? 3 : 4);
        const texts = item.options.map((id) => CONTENT.wordsById.get(id)!.text);
        for (const t of texts) expect(isWordAllowed(t, allow), `${c.label}: «${t}» not readable`).toBe(true);
        for (const a of texts) for (const b of texts) if (a !== b) expect(wordsSoundSame(a, b), `${c.label}: ${a}/${b}`).toBe(false);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });
});
