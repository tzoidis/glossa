// «Ενώνω συλλαβές»: picture + shuffled syllable tiles, put in order.
// The syllables are on screen, so the whole word must pass the allowed-words rule.
// Levels: 1 = two-syllable words, 2 = up to three, 3 = any length + one extra tile.

import type { Level, Round } from '../../engine/types.ts';
import { isReadable } from '../pool.ts';
import { buildOrderItems } from '../shared/orderItems.ts';
import type { GenerateContext } from '../types.ts';

export const JOIN_SYLLABLES_ID = 'join-syllables';

const MAX_SYLLABLES: Record<Level, number> = { 1: 2, 2: 3, 3: 4 };

export function generateJoinSyllables(ctx: GenerateContext): Round {
  const readable = ctx.wordPool.filter((w) => w.imageId && w.syllables.length >= 2 && isReadable(w, ctx));
  const items = buildOrderItems(ctx, readable, {
    partsOf: (w) => w.syllables,
    fits: (w) => w.syllables.length <= MAX_SYLLABLES[ctx.level],
  });
  return { id: `${JOIN_SYLLABLES_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: JOIN_SYLLABLES_ID, seed: 0, level: ctx.level, items };
}
