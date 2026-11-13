// «Γράφω με το δάχτυλο»: trace a letter, stroke by stroke, in the order and the
// direction of the school sheet (strokes.json). A small model above shows each
// stroke being written; the writing box is below it, so the hand never covers
// the model (PRD §4, left-handed children too).
// Levels: 1 small letters, the letter shown strongly, wide tolerance; 2 small and
// capital letters, the letter faint; 3 only the start dots, a tighter tolerance.

import greek from '../../content/greek.json' with { type: 'json' };
import { shuffle } from '../../engine/rng.ts';
import type { Level, Round } from '../../engine/types.ts';
import { isEasyPosition, NotEnoughContent, ROUND_SIZE } from '../pool.ts';
import type { GenerateContext } from '../types.ts';
import { strokesOf, type LetterCase } from './strokes.ts';

export const TRACE_ID = 'trace';
/** how far the finger may stray, in units of the 0-100 box */
export const TOLERANCE: Record<Level, number> = { 1: 14, 2: 11, 3: 9 };
/** the newest letters come up more: they are the ones being learnt at school */
const NEWEST = 3;

export interface TraceItem {
  /** the small letter, the review key */
  target: string;
  /** the letter as written: small or capital */
  letter: string;
  letterCase: LetterCase;
}

export function generateTrace(ctx: GenerateContext): Round {
  const taught = [...ctx.allowedGraphemes].filter((g) => [...g].length === 1 && strokesOf(g, 'lower'));
  if (taught.length === 0) throw new NotEnoughContent('no letter taught yet');
  // the final sigma is written with σ
  const small = taught.includes(greek.sigma) && strokesOf(greek.finalSigma, 'lower') ? [...taught, greek.finalSigma] : taught;
  const newest = taught.slice(-NEWEST);
  // letters traced badly come back here only (trace:, not grapheme: — a motor slip is not a reading error)
  const due = ctx.reviewQueue.filter((k) => k.startsWith('trace:')).map((k) => k.slice('trace:'.length)).filter((g) => small.includes(g));

  const items: TraceItem[] = [];
  const order = [...shuffle(due, ctx.rng), ...shuffle(newest, ctx.rng), ...shuffle(small, ctx.rng)];
  for (let i = 0; items.length < ROUND_SIZE; i++) {
    const target = order[i % order.length]!;
    // capitals from level 2, never on the easy items
    const capital = ctx.level > 1 && !isEasyPosition(items.length) && target !== greek.finalSigma && ctx.rng() < 0.5;
    const letterCase: LetterCase = capital ? 'upper' : 'lower';
    const letter = capital ? target.toLocaleUpperCase('el') : target;
    if (!strokesOf(letter, letterCase)) continue;
    // no letter twice in a row
    if (items.at(-1)?.letter === letter && small.length > 1) continue;
    items.push({ target, letter, letterCase });
    if (i > ROUND_SIZE * 20) break;
  }
  return { id: `${TRACE_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: TRACE_ID, seed: 0, level: ctx.level, items };
}
