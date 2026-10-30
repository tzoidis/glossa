// «Ποιο γράμμα ακούς;»: a recorded letter sound plays, the child taps the letter.
// Choices start from a sound, so none may sound like the answer (PRD §4). Letters
// due for review come mid-round; the most recently taught letters come up more.

import { distinctSounds } from '../../engine/homophones.ts';
import { pick, shuffle } from '../../engine/rng.ts';
import type { Round } from '../../engine/types.ts';
import { graphemeItemId } from '../answer.ts';
import { isEasyPosition, NotEnoughContent, ROUND_SIZE, visuallySimilar } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const WHICH_LETTER_ID = 'which-letter';
const NEWEST = 3;

export interface WhichLetterItem {
  target: string;
  options: string[];
}

export function generateWhichLetter(ctx: GenerateContext): Round {
  const letters = [...ctx.allowedGraphemes];
  if (distinctSounds(letters[0] ?? '', letters.slice(1)).length < 1) throw new NotEnoughContent('fewer than 2 letter sounds');

  const due = ctx.reviewQueue.filter((k) => k.startsWith('grapheme:')).map((k) => k.slice('grapheme:'.length)).filter((g) => ctx.allowedGraphemes.has(g));
  const review = shuffle(due, ctx.rng).slice(0, 2);
  const newest = letters.slice(-NEWEST);

  const targets: string[] = [];
  for (let i = 0; i < ROUND_SIZE; i++) {
    const fromReview = !isEasyPosition(i) ? review.shift() : undefined;
    let g = fromReview ?? pick(ctx.rng() < 0.5 ? newest : letters, ctx.rng);
    // never the same letter twice in a row
    if (g === targets[i - 1]) g = pick(letters.filter((x) => x !== g), ctx.rng);
    targets.push(g);
  }

  const items: WhichLetterItem[] = targets.map((target, i) => {
    const hard = ctx.level > 1 && !isEasyPosition(i);
    let others = shuffle(
      letters.filter((g) => g !== target),
      ctx.rng,
    );
    if (ctx.level === 3 && hard) {
      const similar = visuallySimilar(target).filter((g) => ctx.allowedGraphemes.has(g));
      others = [...similar, ...others.filter((g) => !similar.includes(g))];
    }
    const wrong = distinctSounds(target, others).slice(0, (hard ? 4 : 3) - 1);
    if (wrong.length === 0) throw new NotEnoughContent('no letter that sounds different');
    return { target, options: shuffle([target, ...wrong], ctx.rng) };
  });

  return { id: `${WHICH_LETTER_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: WHICH_LETTER_ID, seed: 0, level: ctx.level, items };
}

export const whichLetterItemId = (item: WhichLetterItem) => graphemeItemId(item.target);
