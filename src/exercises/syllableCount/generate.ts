// «Πόσες συλλαβές;»: picture + heard word, tap 1-4 claps. No letters on screen,
// so any word with a picture works from the transition period on. Counts follow
// the book's syllabification (πά-πια = 2).

import type { Level, Round } from '../../engine/types.ts';
import { isEasyPosition, MIN_DISTINCT_WORDS, pickWords } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const SYLLABLE_COUNT_ID = 'syllable-count';
export const MAX_CLAPS = 4;

export interface SyllableCountItem {
  wordId: string;
  text: string;
  imageId: string;
  syllables: string[];
  target: string;
  options: string[];
}

const LENGTHS: Record<Level, [number, number]> = { 1: [2, 3], 2: [1, 4], 3: [1, 4] };

export function generateSyllableCount(ctx: GenerateContext): Round {
  const pool = ctx.wordPool.filter((w) => w.imageId && w.syllables.length >= 1 && w.syllables.length <= MAX_CLAPS);
  const [min, max] = LENGTHS[ctx.level];
  const fitting = pool.filter((w) => w.syllables.length >= min && w.syllables.length <= max);
  const words = pickWords(fitting.length >= MIN_DISTINCT_WORDS ? fitting : pool, ctx);

  const items: SyllableCountItem[] = words.map((w, i) => {
    const n = w.syllables.length;
    // easy: three neighbouring counts around the answer; hard: all four
    const start = Math.max(1, Math.min(n - 1, MAX_CLAPS - 2));
    const options = ctx.level === 1 || isEasyPosition(i) ? [start, start + 1, start + 2] : [1, 2, 3, 4];
    return { wordId: w.id, text: w.text, imageId: w.imageId!, syllables: w.syllables, target: String(n), options: options.map(String) };
  });

  return { id: `${SYLLABLE_COUNT_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: SYLLABLE_COUNT_ID, seed: 0, level: ctx.level, items };
}
