// «Χτίζω τη λέξη»: picture + shuffled letter tiles, put in order. A digraph is one
// tile (ου, μπ); accents stay on their letter (π-ί-τ-α). Levels: up to 4 letters,
// then 5, then any length with one extra taught letter (which may sound like a
// right one: that gets the gentle "sounds right" message).

import { surfaceGraphemes } from '../../engine/greekTokenizer.ts';
import type { Level, Round } from '../../engine/types.ts';
import { isReadable, wordGraphemes } from '../pool.ts';
import { buildOrderItems } from '../shared/orderItems.ts';
import type { GenerateContext } from '../types.ts';

export const BUILD_WORD_ID = 'build-word';

const MAX_LETTERS: Record<Level, number> = { 1: 4, 2: 5, 3: 8 };

export function generateBuildWord(ctx: GenerateContext): Round {
  const readable = ctx.wordPool.filter((w) => w.imageId && wordGraphemes(w).length >= 2 && isReadable(w, ctx));
  const items = buildOrderItems(ctx, readable, {
    partsOf: (w) => surfaceGraphemes(w.text),
    fits: (w) => wordGraphemes(w).length <= MAX_LETTERS[ctx.level],
    extraPieces: () => [...ctx.allowedGraphemes],
  });
  return { id: `${BUILD_WORD_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: BUILD_WORD_ID, seed: 0, level: ctx.level, items };
}
