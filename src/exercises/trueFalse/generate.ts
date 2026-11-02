// «Σωστό ή λάθος;»: a short sentence next to a picture; the child reads it and taps
// the green tick if the sentence fits the picture, the red cross if not (as in the
// book's Σ/Λ). The sentence is reading material: heard only if the child asks.
// ctx.sentencePool holds only the sentences readable now (buildGenerateContext).
// Levels: 1 short sentences; 2 any; 3 longer ones first.

import { shuffle } from '../../engine/rng.ts';
import type { Round, Sentence } from '../../engine/types.ts';
import { isEasyPosition, NotEnoughContent, ROUND_SIZE } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const TRUE_FALSE_ID = 'true-false';
export const YES = 'yes';
export const NO = 'no';
/** fewer distinct sentences than this and the round would repeat them */
const MIN_SENTENCES = 6;

export interface TrueFalseItem {
  sentenceId: string;
  text: string;
  imageId: string;
  options: [typeof YES, typeof NO];
  target: typeof YES | typeof NO;
}

/** «Το πουλί πετά .» → «Το πουλί πετά.» */
export function sentenceText(s: Sentence): string {
  return s.tokens.reduce((text, tok) => (/^[\p{L}\p{M}]/u.test(tok) && text ? `${text} ${tok}` : text + tok), '');
}

const wordCount = (s: Sentence) => s.tokens.filter((t) => /\p{L}/u.test(t)).length;

export function generateTrueFalse(ctx: GenerateContext): Round {
  const pool = ctx.sentencePool.filter((s) => s.imageId && typeof s.isTrueForImage === 'boolean');
  const yes = pool.filter((s) => s.isTrueForImage);
  const no = pool.filter((s) => !s.isTrueForImage);
  if (pool.length < MIN_SENTENCES || yes.length < 2 || no.length < 2) throw new NotEnoughContent(`only ${pool.length} sentences`);

  const due = new Set(ctx.reviewQueue.filter((k) => k.startsWith('sentence:')).map((k) => k.slice('sentence:'.length)));
  const byLevel = (ss: Sentence[]) => {
    const s = shuffle(ss, ctx.rng);
    if (ctx.level === 2) return s;
    return s.sort((a, b) => (ctx.level === 1 ? wordCount(a) - wordCount(b) : wordCount(b) - wordCount(a)));
  };
  // at least 2 of each answer, the fifth either way
  const answers = shuffle([true, true, false, false, ctx.rng() < 0.5], ctx.rng);

  const usedText = new Set<string>();
  const items: TrueFalseItem[] = [];
  for (let i = 0; i < ROUND_SIZE; i++) {
    const free = (ss: Sentence[], want: boolean) => ss.filter((s) => s.isTrueForImage === want && !usedText.has(sentenceText(s)));
    // the same words may be true for one picture and false for another: never both in a round
    const want = free(pool, answers[i]!).length ? answers[i]! : !answers[i];
    const review = isEasyPosition(i) ? [] : free(pool.filter((s) => due.has(s.id)), want);
    const s = review[0] ?? byLevel(free(pool, want))[0];
    if (!s) throw new NotEnoughContent('too few different sentences');
    usedText.add(sentenceText(s));
    items.push({ sentenceId: s.id, text: sentenceText(s), imageId: s.imageId!, options: [YES, NO], target: want ? YES : NO });
  }
  if (items.filter((x) => x.target === YES).length < 2 || items.filter((x) => x.target === NO).length < 2) {
    throw new NotEnoughContent('too few sentences of one answer');
  }

  return { id: `${TRUE_FALSE_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: TRUE_FALSE_ID, seed: 0, level: ctx.level, items };
}
