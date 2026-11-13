// Helpers every exercise uses to choose words: the allowed-words rule as seen
// from GenerateContext, and round ordering (PRD §5).

import greek from '../content/greek.json' with { type: 'json' };
import { graphemes, tokenize } from '../engine/greekTokenizer.ts';
import { shuffle } from '../engine/rng.ts';
import type { Word } from '../engine/types.ts';
import { wordIdOf } from './answer.ts';
import type { GenerateContext } from './types.ts';

/** Thrown by generate() when the current position cannot fill a round. The exercise is then not offered. */
export class NotEnoughContent extends Error {}

export const ROUND_SIZE = 5;
/** Fewer distinct words than this and the exercise is hidden rather than repetitive. */
export const MIN_DISTINCT_WORDS = 3;

export function wordGraphemes(w: Word): string[] {
  return w.graphemes ?? graphemes(w.text);
}

/** The full allowed-words rule: the word itself is shown on screen. */
export function isReadable(w: Word, ctx: GenerateContext): boolean {
  if (tokenize(w.text).some((t) => t.diaeresis)) return false; // diaeresis skill: off in the MVP
  return wordGraphemes(w).every((g) => ctx.allowedGraphemes.has(g)) && w.flags.every((f) => ctx.unlockedFlags.has(f));
}

export function areTaught(gs: string[], ctx: GenerateContext): boolean {
  return gs.every((g) => ctx.allowedGraphemes.has(g));
}

/**
 * Letters due for review (grapheme:<g>) bring back a word that has them, through the
 * word review pickWords already does: one word per letter, `letterOf` says where.
 */
export function withLetterReview(ctx: GenerateContext, pool: Word[], letterOf: (w: Word) => string[]): GenerateContext {
  const due = ctx.reviewQueue.filter((k) => k.startsWith('grapheme:')).map((k) => k.slice('grapheme:'.length));
  if (due.length === 0) return ctx;
  const extra = due.flatMap((g) => {
    const w = pool.find((x) => letterOf(x).includes(g));
    return w ? [`word:${w.id}`] : [];
  });
  return { ...ctx, reviewQueue: [...ctx.reviewQueue, ...extra] };
}

/** How many of the latest letters count as «the letters of the week». */
export const NEWEST = 2;

/** The letters the class is learning now: the last taught (allowedGraphemes keeps book order). */
export function newestGraphemes(ctx: GenerateContext): Set<string> {
  return new Set([...ctx.allowedGraphemes].slice(-NEWEST));
}

/** a0, b0, a1, b1, …, then what is left of the longer list */
function alternate<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]!);
    if (i < b.length) out.push(b[i]!);
  }
  return out;
}

/** Is item i one of the easy ones? Rounds open with 2 easy items and end with a sure success. */
export function isEasyPosition(i: number, size = ROUND_SIZE): boolean {
  return i < 2 || i === size - 1;
}

/**
 * Picks the round's words: up to 2 due for review (placed mid-round), then words not
 * seen in the last rounds, then recent ones if needed (PRD §5: relax the recency rule
 * before hiding the exercise). Repeats only if the pool has at least MIN_DISTINCT_WORDS.
 */
export function pickWords(pool: Word[], ctx: GenerateContext, size = ROUND_SIZE): Word[] {
  const reviewIds = new Set(ctx.reviewQueue.map(wordIdOf).filter((id): id is string => id !== null));
  const recent = new Set(ctx.recentWordIds);
  const review = shuffle(pool.filter((w) => reviewIds.has(w.id)), ctx.rng).slice(0, 2);
  const others = pool.filter((w) => !reviewIds.has(w.id));
  const byRecency = [...shuffle(others.filter((w) => !recent.has(w.id)), ctx.rng), ...shuffle(others.filter((w) => recent.has(w.id)), ctx.rng)];
  // every other word has one of the letters the class is learning now
  const newest = newestGraphemes(ctx);
  const hasNew = (w: Word) => wordGraphemes(w).some((g) => newest.has(g));
  const fresh = alternate(byRecency.filter(hasNew), byRecency.filter((w) => !hasNew(w)));

  const distinct = review.length + fresh.length;
  if (distinct < MIN_DISTINCT_WORDS) throw new NotEnoughContent(`only ${distinct} words`);

  const easy = fresh.slice(0, size - review.length);
  const refill = fresh.length > 0 ? fresh : review;
  for (let k = 0; easy.length + review.length < size; k++) easy.push(refill[k % refill.length]!);

  // easy, easy, review, review, easy
  const out: Word[] = [];
  const e = [...easy];
  const r = [...review];
  for (let i = 0; i < size; i++) out.push((isEasyPosition(i, size) ? e.shift() : r.shift()) ?? e.shift() ?? r.shift()!);
  return out;
}

const SIMILAR = new Map<string, string[]>();
for (const [a, b] of greek.visuallySimilar) {
  SIMILAR.set(a!, [...(SIMILAR.get(a!) ?? []), b!]);
  SIMILAR.set(b!, [...(SIMILAR.get(b!) ?? []), a!]);
}

/** Letters that look like this one (Π/Τ…), for the hardest level of letter-and-picture exercises. */
export function visuallySimilar(g: string): string[] {
  return SIMILAR.get(g) ?? [];
}
