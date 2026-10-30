// «Ενώνω συλλαβές»: picture + shuffled syllable tiles, put in order.
// The syllables are on screen, so the whole word must pass the allowed-words rule.
// Levels: 1 = two-syllable words, 2 = up to three, 3 = any length + one extra tile.

import { shuffle } from '../../engine/rng.ts';
import type { Level, Round, Word } from '../../engine/types.ts';
import { isEasyPosition, isReadable, MIN_DISTINCT_WORDS, pickWords } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const JOIN_SYLLABLES_ID = 'join-syllables';

export interface SyllableTile {
  id: string;
  text: string;
}

export interface JoinSyllablesItem {
  wordId: string;
  text: string;
  imageId: string;
  syllables: string[];
  tiles: SyllableTile[];
}

const MAX_SYLLABLES: Record<Level, number> = { 1: 2, 2: 3, 3: 4 };

const same = (a: string, b: string) => a.toLocaleLowerCase('el') === b.toLocaleLowerCase('el');

export function generateJoinSyllables(ctx: GenerateContext): Round {
  const readable = ctx.wordPool.filter((w) => w.imageId && w.syllables.length >= 2 && isReadable(w, ctx));
  const fitting = readable.filter((w) => w.syllables.length <= MAX_SYLLABLES[ctx.level]);
  const words = pickWords(fitting.length >= MIN_DISTINCT_WORDS ? fitting : readable, ctx);
  const spareSyllables = readable.flatMap((w) => w.syllables);

  const items: JoinSyllablesItem[] = words.map((w: Word, i) => {
    const tiles: SyllableTile[] = w.syllables.map((text, k) => ({ id: String(k), text }));
    if (ctx.level === 3 && !isEasyPosition(i)) {
      const extra = shuffle(spareSyllables, ctx.rng).find((s) => !w.syllables.some((own) => same(own, s)));
      if (extra) tiles.push({ id: 'extra', text: extra });
    }
    let order = shuffle(tiles, ctx.rng);
    // never hand the child an already-solved row
    if (order.slice(0, w.syllables.length).every((t, k) => same(t.text, w.syllables[k]!))) order = [...order.slice(1), order[0]!];
    return { wordId: w.id, text: w.text, imageId: w.imageId!, syllables: w.syllables, tiles: order };
  });

  return { id: `${JOIN_SYLLABLES_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: JOIN_SYLLABLES_ID, seed: 0, level: ctx.level, items };
}
