// «Με τι αρχίζει;»: picture + heard word, the child picks the first letter.
// The word is not shown, so only its first grapheme must be taught. The choices
// start from a sound, so none may sound like the answer (PRD §4).

import { distinctSounds } from '../../engine/homophones.ts';
import { shuffle } from '../../engine/rng.ts';
import type { Round } from '../../engine/types.ts';
import { isEasyPosition, NotEnoughContent, pickWords, visuallySimilar, withLetterReview, wordGraphemes } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const FIRST_LETTER_ID = 'first-letter';

export interface FirstLetterItem {
  wordId: string;
  text: string;
  imageId: string;
  /** played as the hint after a wrong answer */
  firstSyllable: string;
  target: string;
  options: string[];
}

export function generateFirstLetter(ctx: GenerateContext): Round {
  const letters = [...ctx.allowedGraphemes];
  const pool = ctx.wordPool.filter((w) => w.imageId && ctx.allowedGraphemes.has(wordGraphemes(w)[0]!));
  const words = pickWords(pool, withLetterReview(ctx, pool, (w) => [wordGraphemes(w)[0]!]));

  const items: FirstLetterItem[] = words.map((w, i) => {
    const target = wordGraphemes(w)[0]!;
    const hard = ctx.level > 1 && !isEasyPosition(i);
    const count = hard ? 4 : 3;
    let others = shuffle(
      letters.filter((g) => g !== target),
      ctx.rng,
    );
    if (ctx.level === 3 && hard) {
      const similar = visuallySimilar(target).filter((g) => ctx.allowedGraphemes.has(g));
      others = [...similar, ...others.filter((g) => !similar.includes(g))];
    }
    const wrong = distinctSounds(target, others).slice(0, count - 1);
    if (wrong.length === 0) throw new NotEnoughContent('no letter that sounds different');
    return { wordId: w.id, text: w.text, imageId: w.imageId!, firstSyllable: w.syllables[0]!, target, options: shuffle([target, ...wrong], ctx.rng) };
  });

  return { id: `${FIRST_LETTER_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: FIRST_LETTER_ID, seed: 0, level: ctx.level, items };
}
