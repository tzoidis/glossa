import { describe, expect, it } from 'vitest';
import { CONTENT } from '../app/content.ts';
import { cases } from './propertyTest.ts';
import { isReadable, newestGraphemes, pickWords, wordGraphemes } from './pool.ts';

describe('pickWords and the letters of the week', () => {
  it('puts the newest letters in about half the words when there are enough of them', () => {
    let checked = 0;
    for (const c of cases()) {
      if (c.level !== 1 || c.position < 10) continue;
      const newest = newestGraphemes(c.ctx);
      const pool = CONTENT.words.filter((w) => isReadable(w, c.ctx));
      const withNew = pool.filter((w) => wordGraphemes(w).some((g) => newest.has(g)));
      if (withNew.length < 3) continue;
      checked++;
      const words = pickWords(pool, c.ctx);
      const count = words.filter((w) => wordGraphemes(w).some((g) => newest.has(g))).length;
      expect(count, `${c.label}: ${words.map((w) => w.text)}`).toBeGreaterThanOrEqual(2);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('takes the newest letters in book order', () => {
    const c = [...cases()].find((x) => x.position === 12)!;
    expect([...newestGraphemes(c.ctx)]).toEqual(CONTENT.order.order.slice(10, 12));
  });
});
