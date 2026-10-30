// Builds items for ordering exercises (syllables, letters).

import { shuffle } from '../../engine/rng.ts';
import type { Word } from '../../engine/types.ts';
import { isEasyPosition, MIN_DISTINCT_WORDS, pickWords } from '../pool.ts';
import type { GenerateContext } from '../types.ts';
import type { OrderItem, OrderTile } from './OrderExercise.tsx';

const same = (a: string, b: string) => a.toLocaleLowerCase('el') === b.toLocaleLowerCase('el');

export interface OrderSpec {
  partsOf(w: Word): string[];
  /** preferred words for this level; falls back to all if too few */
  fits(w: Word): boolean;
  /** level 3, mid-round: one extra piece that does not belong (must itself be allowed on screen) */
  extraPieces?(w: Word): string[];
}

export function buildOrderItems(ctx: GenerateContext, pool: Word[], spec: OrderSpec): OrderItem[] {
  const fitting = pool.filter(spec.fits);
  const words = pickWords(fitting.length >= MIN_DISTINCT_WORDS ? fitting : pool, ctx);
  const spare = (w: Word) => spec.extraPieces?.(w) ?? pool.flatMap(spec.partsOf);

  return words.map((w, i) => {
    const parts = spec.partsOf(w);
    const tiles: OrderTile[] = parts.map((text, k) => ({ id: String(k), text }));
    if (ctx.level === 3 && !isEasyPosition(i)) {
      const extra = shuffle(spare(w), ctx.rng).find((s) => !parts.some((own) => same(own, s)));
      if (extra) tiles.push({ id: 'extra', text: extra });
    }
    let order = shuffle(tiles, ctx.rng);
    // never hand the child an already-solved row
    if (order.slice(0, parts.length).every((t, k) => same(t.text, parts[k]!))) order = [...order.slice(1), order[0]!];
    return { wordId: w.id, text: w.text, imageId: w.imageId!, parts, tiles: order };
  });
}
