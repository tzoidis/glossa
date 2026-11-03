// «Βάλε τον τόνο»: the word is heard and shown split into syllables without its
// accent (πα-τα-τα); the child taps the stressed syllable, which then shows its
// accent. PRD §4: words of 2+ syllables, lower case, heard.
// Levels: 1 two syllables; 2 up to three; 3 any length.

import { lowerKey } from '../../engine/greekTokenizer.ts';
import type { Level, Round } from '../../engine/types.ts';
import { isReadable, MIN_DISTINCT_WORDS, NotEnoughContent, pickWords } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const STRESS_ID = 'stress';
const MAX_SYLLABLES: Record<Level, number> = { 1: 2, 2: 3, 3: 99 };
const ACUTE = '́';

export interface StressItem {
  wordId: string;
  text: string;
  /** the syllables as written, accent included */
  syllables: string[];
  /** the same without the accent: what the tiles show until solved */
  bare: string[];
  /** index of the stressed syllable, as a string (choice id) */
  target: string;
  options: string[];
}

export const hasAccent = (s: string) => s.normalize('NFD').includes(ACUTE);
export const withoutAccent = (s: string) => s.normalize('NFD').split(ACUTE).join('').normalize('NFC');

export function generateStress(ctx: GenerateContext): Round {
  const pool = ctx.wordPool.filter((w) => w.syllables.length >= 2 && w.syllables.filter(hasAccent).length === 1 && isReadable(w, ctx));
  if (pool.length < MIN_DISTINCT_WORDS) throw new NotEnoughContent(`only ${pool.length} words`);
  const fitting = pool.filter((w) => w.syllables.length <= MAX_SYLLABLES[ctx.level]);
  const words = pickWords(fitting.length >= MIN_DISTINCT_WORDS ? fitting : pool, ctx);

  const items: StressItem[] = words.map((w) => {
    const syllables = w.syllables.map(lowerKey);
    return {
      wordId: w.id,
      text: w.text,
      syllables,
      bare: syllables.map(withoutAccent),
      target: String(syllables.findIndex(hasAccent)),
      options: syllables.map((_, i) => String(i)),
    };
  });
  return { id: `${STRESS_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: STRESS_ID, seed: 0, level: ctx.level, items };
}
