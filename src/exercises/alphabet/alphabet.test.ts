import { describe, expect, it } from 'vitest';
import greek from '../../content/greek.json' with { type: 'json' };
import { CONTENT } from '../../app/content.ts';
import { graphemes } from '../../engine/greekTokenizer.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import { isReadable } from '../pool.ts';
import type { OrderItem } from '../shared/OrderExercise.tsx';
import { alphabet } from './index.ts';

const rank = (s: string) => greek.alphabet.indexOf(graphemes(s)[0]!);

describe('alphabet property test', () => {
  it('deals taught letters, or readable words, whose answer is in alphabetical order', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(alphabet, c);
      if (!round) continue;
      generated++;
      for (const item of round.items as OrderItem[]) {
        const ranks = item.parts.map(rank);
        expect(ranks.every((r) => r >= 0), `${c.label}: ${item.parts}`).toBe(true);
        expect([...ranks].sort((a, b) => a - b), c.label).toEqual(ranks);
        expect(new Set(ranks).size, c.label).toBe(ranks.length);
        expect(item.tiles.map((t) => t.text).sort(), c.label).toEqual([...item.parts].sort());
        expect(item.tiles.map((t) => t.text), c.label).not.toEqual(item.parts);
        for (const part of item.parts) {
          if (part.length === 1) expect(c.ctx.allowedGraphemes.has(part), `${c.label}: «${part}»`).toBe(true);
          else expect(isReadable(CONTENT.words.find((w) => w.text === part)!, c.ctx), `${c.label}: «${part}»`).toBe(true);
        }
        if (c.level < 3) expect(item.parts.length, c.label).toBe(c.level + 2);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('waits for unit 4', () => {
    const at = (p: number) => [...cases()].find((x) => x.position === p)!;
    expect(tryGenerate(alphabet, at(28))).not.toBeNull();
  });
});
