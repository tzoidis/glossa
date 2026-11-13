import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { isTextAllowed, makeContext } from '../../engine/allowedWords.ts';
import { cases, tryGenerate } from '../propertyTest.ts';
import type { OrderItem } from '../shared/OrderExercise.tsx';
import { sentenceParts } from './generate.ts';
import { buildSentence } from './index.ts';

describe('build-sentence property test', () => {
  it('only puts readable sentences and words on screen, never in order', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(buildSentence, c);
      if (!round) continue;
      generated++;
      const allow = makeContext(CONTENT.curriculum, { position: c.position }, CONTENT.words);
      const items = round.items as OrderItem[];
      expect(items, c.label).toHaveLength(5);
      for (const item of items) {
        const s = CONTENT.sentences.find((x) => x.id === item.sentenceId)!;
        expect(s.isTrueForImage, c.label).toBe(true);
        expect(item.imageId, c.label).toBe(s.imageId);
        expect(item.parts, c.label).toEqual(sentenceParts(s));
        expect(item.parts.reduce((x, p) => (/^\p{L}/u.test(p) && x ? `${x} ${p}` : x + p), ''), c.label).toBe(item.text);
        for (const tile of item.tiles) expect(isTextAllowed(tile.text, allow), `${c.label}: «${tile.text}»`).toBe(true);
        const extra = item.tiles.length - item.parts.length;
        expect(extra, c.label).toBeLessThanOrEqual(c.level === 3 ? 1 : 0);
        expect(item.tiles.map((t) => t.text).join(' '), c.label).not.toBe(item.text);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('keeps the capital on the first word and makes the full stop a piece of its own', () => {
    const s = CONTENT.sentences.find((x) => x.tokens.join(' ') === 'Το πουλί πετά .')!;
    expect(sentenceParts(s)).toEqual(['Το', 'πουλί', 'πετά', '.']);
  });

  it('is offered by the end of unit 2', () => {
    const at = (p: number) => [...cases()].find((c) => c.position === p)!;
    expect(tryGenerate(buildSentence, at(18))).not.toBeNull();
  });
});
