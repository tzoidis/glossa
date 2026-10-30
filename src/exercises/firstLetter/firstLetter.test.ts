import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { soundsSame } from '../../engine/homophones.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import { wordGraphemes } from '../pool.ts';
import type { FirstLetterItem } from './generate.ts';
import { firstLetter } from './index.ts';

describe('first-letter property test', () => {
  it('only shows taught letters, never a homophone of the answer, and is deterministic', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(firstLetter, c);
      if (!round) continue;
      generated++;
      const items = round.items as FirstLetterItem[];
      expect(items, c.label).toHaveLength(5);
      for (const item of items) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        expect(wordGraphemes(word)[0], c.label).toBe(item.target);
        expect(item.options, c.label).toContain(item.target);
        expect(new Set(item.options).size, c.label).toBe(item.options.length);
        expect(item.options.length, c.label).toBeGreaterThanOrEqual(2);
        expect(item.options.length, c.label).toBeLessThanOrEqual(c.level === 1 ? 3 : 4);
        for (const g of item.options) {
          expect(c.ctx.allowedGraphemes.has(g), `${c.label}: «${g}» not taught`).toBe(true);
          if (g !== item.target) expect(soundsSame(g, item.target), `${c.label}: «${g}» sounds like «${item.target}»`).toBe(false);
        }
        for (const a of item.options) for (const b of item.options) if (a !== b) expect(soundsSame(a, b), c.label).toBe(false);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('gives the same round for the same seed', () => {
    const [c1] = [...cases()].filter((c) => c.position === 18 && c.level === 2);
    const [c2] = [...cases()].filter((c) => c.position === 18 && c.level === 2);
    expect(firstLetter.generate(c1!.ctx)).toEqual(firstLetter.generate(c2!.ctx));
  });

  it('starts at the 2nd letter of unit 1 and avoids recent words when it can', () => {
    const at = (p: number) => [...cases()].find((c) => c.position === p)!;
    expect(tryGenerate(firstLetter, at(1))).toBeNull();
    expect(tryGenerate(firstLetter, at(2))).not.toBeNull();

    const recent = CONTENT.words.slice(0, 40).map((w) => w.id);
    const c = [...cases(recent)].find((x) => x.position === 18)!;
    const ids = (firstLetter.generate(c.ctx).items as FirstLetterItem[]).map((i) => i.wordId);
    expect(ids.some((id) => recent.includes(id))).toBe(false);
  });
});
