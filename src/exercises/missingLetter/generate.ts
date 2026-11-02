// «Λείπει ένα γράμμα»: picture + written word with one grapheme missing (πα_ί),
// the child picks it among taught graphemes. The word is read, so all of it must
// be readable (PRD §3). Wrong choices never sound like the answer (PRD §4), so a
// gap is never solved by a homophone («πόδ_» with η). The gap is never a letter
// with an accent or diaeresis, nor a final ς: the choice would give it away.
// Levels: 3 choices and short words; then 4 choices; then letters that look
// alike (π/τ) and longer words.

import { distinctSounds } from '../../engine/homophones.ts';
import { shuffle } from '../../engine/rng.ts';
import { tokenize } from '../../engine/greekTokenizer.ts';
import type { Level, Round, Word } from '../../engine/types.ts';
import { isEasyPosition, isReadable, MIN_DISTINCT_WORDS, NotEnoughContent, pickWords, visuallySimilar } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const MISSING_LETTER_ID = 'missing-letter';
const MAX_GRAPHEMES: Record<Level, number> = { 1: 5, 2: 7, 3: 12 };

export interface MissingLetterItem {
  wordId: string;
  text: string;
  imageId: string;
  /** the word as written, one entry per grapheme («πίτα» → π, ί, τ, α) */
  parts: string[];
  gap: number;
  target: string;
  options: string[];
}

/** graphemes that may be left out: plain, so the choices show them exactly as written */
function gapsOf(w: Word): number[] {
  return tokenize(w.text).flatMap((t, i) => (!t.accent && !t.diaeresis && t.surface === t.g ? [i] : []));
}

export function generateMissingLetter(ctx: GenerateContext): Round {
  const letters = [...ctx.allowedGraphemes];
  const pool = ctx.wordPool.filter((w) => w.imageId && isReadable(w, ctx) && gapsOf(w).length > 0);
  const fitting = pool.filter((w) => tokenize(w.text).length <= MAX_GRAPHEMES[ctx.level]);
  const words = pickWords(fitting.length >= MIN_DISTINCT_WORDS ? fitting : pool, ctx);

  const items: MissingLetterItem[] = words.map((w, i) => {
    const tokens = tokenize(w.text);
    const hard = ctx.level > 1 && !isEasyPosition(i);
    const count = hard ? 4 : 3;
    // a gap with enough different-sounding choices
    for (const gap of shuffle(gapsOf(w), ctx.rng)) {
      const target = tokens[gap]!.g;
      let others = shuffle(
        letters.filter((g) => g !== target),
        ctx.rng,
      );
      if (ctx.level === 3 && hard) {
        const similar = visuallySimilar(target).filter((g) => ctx.allowedGraphemes.has(g));
        others = [...similar, ...others.filter((g) => !similar.includes(g))];
      }
      const wrong = distinctSounds(target, others).slice(0, count - 1);
      if (wrong.length < 2) continue;
      return {
        wordId: w.id,
        text: w.text,
        imageId: w.imageId!,
        parts: tokens.map((t) => t.surface),
        gap,
        target,
        options: shuffle([target, ...wrong], ctx.rng),
      };
    }
    throw new NotEnoughContent(`no gap with two different-sounding letters in ${w.id}`);
  });

  return { id: `${MISSING_LETTER_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: MISSING_LETTER_ID, seed: 0, level: ctx.level, items };
}

