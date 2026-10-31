// «Ποια συλλαβή ακούς;»: a syllable clip plays («σα»), the child taps it among
// written syllables. Syllables are open (consonant + vowel, or a vowel alone) and
// built only from taught letters; none needs a locked pronunciation flag (γε, χι).
// Each sound is written once, so no two choices sound the same (PRD §4).
// Levels: 3 choices; then 4; then wrong choices share the consonant or the vowel.

import greek from '../../content/greek.json' with { type: 'json' };
import { graphemes } from '../../engine/greekTokenizer.ts';
import { soundOf } from '../../engine/homophones.ts';
import { detectFlags } from '../../engine/pronunciationFlags.ts';
import { pick, shuffle } from '../../engine/rng.ts';
import { cvSyllables } from '../../engine/syllables.ts';
import type { Round } from '../../engine/types.ts';
import { syllableItemId } from '../answer.ts';
import { isEasyPosition, NotEnoughContent, ROUND_SIZE } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const WHICH_SYLLABLE_ID = 'which-syllable';
/** syllables with one of the newest letters come up more */
const NEWEST = 3;

export interface WhichSyllableItem {
  target: string;
  options: string[];
}

export function allowedSyllables(ctx: GenerateContext): string[] {
  return cvSyllables([...ctx.allowedGraphemes], greek.vowels, soundOf, greek.syllableVowels).filter((s) =>
    detectFlags(s).every((f) => ctx.unlockedFlags.has(f)),
  );
}

const consonantOf = (s: string) => (graphemes(s).length > 1 ? graphemes(s)[0]! : '');
const vowelOf = (s: string) => graphemes(s).at(-1)!;

export function generateWhichSyllable(ctx: GenerateContext): Round {
  const syllables = allowedSyllables(ctx);
  if (syllables.length < 3) throw new NotEnoughContent('fewer than 3 syllables');

  const newest = new Set([...ctx.allowedGraphemes].slice(-NEWEST));
  const fresh = syllables.filter((s) => graphemes(s).some((g) => newest.has(g)));
  const due = ctx.reviewQueue
    .filter((k) => k.startsWith('syllable:'))
    .map((k) => k.slice('syllable:'.length))
    .filter((s) => syllables.includes(s));
  const review = shuffle(due, ctx.rng).slice(0, 2);

  const targets: string[] = [];
  for (let i = 0; i < ROUND_SIZE; i++) {
    const fromReview = !isEasyPosition(i) ? review.shift() : undefined;
    let s = fromReview ?? pick(ctx.rng() < 0.5 && fresh.length ? fresh : syllables, ctx.rng);
    // never the same syllable twice in a row, nor twice in a round when there is room
    const avoid = new Set(syllables.length > ROUND_SIZE ? targets : targets.slice(-1));
    if (avoid.has(s)) s = pick(syllables.filter((x) => !avoid.has(x)), ctx.rng);
    targets.push(s);
  }

  const items: WhichSyllableItem[] = targets.map((target, i) => {
    const hard = ctx.level > 1 && !isEasyPosition(i);
    let others = shuffle(
      syllables.filter((s) => s !== target),
      ctx.rng,
    );
    if (ctx.level === 3 && hard) {
      const close = others.filter((s) => consonantOf(s) === consonantOf(target) || vowelOf(s) === vowelOf(target));
      others = [...close, ...others.filter((s) => !close.includes(s))];
    }
    const wrong = others.slice(0, (hard ? 4 : 3) - 1);
    return { target, options: shuffle([target, ...wrong], ctx.rng) };
  });

  return { id: `${WHICH_SYLLABLE_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: WHICH_SYLLABLE_ID, seed: 0, level: ctx.level, items };
}

export const whichSyllableItemId = (item: WhichSyllableItem) => syllableItemId(item.target);
