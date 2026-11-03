import { describe, expect, it } from 'vitest';
import { cases, tryGenerate } from '../propertyTest.ts';
import type { TraceItem } from './generate.ts';
import { trace } from './index.ts';
import { strokesOf } from './strokes.ts';

describe('trace property test', () => {
  it('asks only for taught letters, with the strokes of the school sheet', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(trace, c);
      if (!round) continue;
      generated++;
      const items = round.items as TraceItem[];
      expect(items, c.label).toHaveLength(5);
      for (const [k, item] of items.entries()) {
        const small = item.target === 'ς' ? 'σ' : item.target;
        expect(c.ctx.allowedGraphemes.has(small), `${c.label}: «${item.target}»`).toBe(true);
        expect(strokesOf(item.letter, item.letterCase), c.label).toBeDefined();
        if (c.level === 1) expect(item.letterCase, c.label).toBe('lower');
        if (k > 0 && new Set(items.map((i) => i.target)).size > 1) expect(item.letter, c.label).not.toBe(items[k - 1]!.letter);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('starts with the first letter', () => {
    const at = (p: number) => [...cases()].find((c) => c.position === p)!;
    expect(tryGenerate(trace, at(0))).toBeNull();
    expect((tryGenerate(trace, at(1))!.items as TraceItem[]).every((i) => i.target === 'α')).toBe(true);
  });
});
