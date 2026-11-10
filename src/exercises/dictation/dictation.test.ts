import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import { isReadable } from '../pool.ts';
import { isFair, lettersOf, type DictationItem } from './generate.ts';
import { dictation } from './index.ts';

describe('lettersOf', () => {
  it('drops the accent and writes a final ς as σ', () => {
    expect(lettersOf('ανανάς')).toEqual(['α', 'ν', 'α', 'ν', 'α', 'σ']);
    expect(lettersOf('μπότα')).toEqual(['μ', 'π', 'ο', 'τ', 'α']);
  });
});

describe('dictation property test', () => {
  it('asks for readable words that the keyboard can write, fair ones below level 3', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(dictation, c);
      if (!round) continue;
      generated++;
      for (const item of round.items as DictationItem[]) {
        const word = CONTENT.wordsById.get(item.wordId)!;
        expect(isReadable(word, c.ctx), `${c.label}: «${word.text}»`).toBe(true);
        for (const l of item.letters) expect(item.keys, `${c.label}: «${word.text}» needs ${l}`).toContain(l);
        for (const k of item.keys) expect([...c.ctx.allowedGraphemes].join(''), `${c.label}: key ${k}`).toContain(k);
        if (c.level < 3) expect(isFair(word, c.ctx), `${c.label}: «${word.text}» is not fair`).toBe(true);
        if (c.level === 1 && item.letters.length > 5) {
          // only when there are too few short fair words
          const short = CONTENT.words.filter((w) => w.imageId && isReadable(w, c.ctx) && isFair(w, c.ctx) && lettersOf(w.text).length <= 5);
          expect(short.length, c.label).toBeLessThan(3);
        }
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('has fair words from the start of unit 3', () => {
    const at = (p: number) => [...cases()].find((c) => c.position === p)!;
    expect(tryGenerate(dictation, at(19))).not.toBeNull();
  });
});
