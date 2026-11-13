// «Τι μπαίνει στο τέλος;»: a sentence without its last mark; the child reads it and
// picks the full stop or the question mark (unit 5), and from unit 7 the
// exclamation mark too. Questions start with a question word (πού, τι, ποιος…) and
// exclamations with an interjection (μπράβο, πω πω…), so the written words decide,
// not the intonation: yes/no questions are left out, written they could be either.
// The sentence is reading material: heard only on request, or slowly after a
// mistake, when the voice's rise or stress is the hint.

import { shuffle } from '../../engine/rng.ts';
import type { Round, Sentence } from '../../engine/types.ts';
import { NotEnoughContent, ROUND_SIZE } from '../pool.ts';
import { sentenceText } from '../trueFalse/generate.ts';
import type { GenerateContext } from '../types.ts';

export const END_MARK_ID = 'end-mark';
export const MARKS = ['.', ';', '!'] as const;
type Mark = (typeof MARKS)[number];

export interface EndMarkItem {
  sentenceId: string;
  /** the sentence without its last mark */
  text: string;
  /** the whole sentence, for the clip's text */
  full: string;
  target: Mark;
  options: Mark[];
}

const markOf = (s: Sentence) => s.tokens.at(-1) as Mark;

export function generateEndMark(ctx: GenerateContext): Round {
  const byMark = (m: Mark) => shuffle(ctx.sentencePool.filter((s) => markOf(s) === m), ctx.rng);
  const stops = byMark('.');
  const questions = byMark(';');
  const exclamations = byMark('!');
  if (questions.length < 3 || stops.length < 3) throw new NotEnoughContent('the question mark is not taught yet');
  const options: Mark[] = exclamations.length >= 2 ? [...MARKS] : ['.', ';'];

  // two questions, two statements, and an exclamation once taught (else one more of either)
  const wanted: Mark[] = shuffle(['.', ';', '.', ';', exclamations.length >= 2 ? '!' : ctx.rng() < 0.5 ? '.' : ';'], ctx.rng);
  const take = { '.': stops, ';': questions, '!': exclamations };
  const due = new Set(ctx.reviewQueue.filter((k) => k.startsWith('sentence:')).map((k) => k.slice('sentence:'.length)));
  const items: EndMarkItem[] = wanted.slice(0, ROUND_SIZE).map((m) => {
    const list = take[m];
    const i = Math.max(0, list.findIndex((s) => due.has(s.id)));
    const s = list.splice(i, 1)[0] ?? take[m === '!' ? '.' : m][0]!;
    return { sentenceId: s.id, text: sentenceText({ ...s, tokens: s.tokens.slice(0, -1) }), full: sentenceText(s), target: markOf(s), options };
  });
  return { id: `${END_MARK_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: END_MARK_ID, seed: 0, level: ctx.level, items };
}
