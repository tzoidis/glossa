// «Φτιάχνω πρόταση»: the words of a sentence, shuffled, to put in order next to
// its picture. The capital letter shows which word comes first and the full stop,
// a piece of its own, goes last, as in the book; the words in between must be read
// (with the stop on the last word, a 3-word sentence solved itself). Only sentences that
// are true for their picture, so the picture helps. The sentence is reading
// material: heard only if the child asks, or slowly after a mistake.
// Levels (words, not counting the stop): 1 up to 3; 2 up to 4; 3 any length + one
// extra word mid-round.

import { shuffle } from '../../engine/rng.ts';
import type { Level, Round, Sentence } from '../../engine/types.ts';
import { isEasyPosition, NotEnoughContent, ROUND_SIZE } from '../pool.ts';
import type { OrderItem, OrderTile } from '../shared/OrderExercise.tsx';
import { sentenceText } from '../trueFalse/generate.ts';
import type { GenerateContext } from '../types.ts';

export const BUILD_SENTENCE_ID = 'build-sentence';
const MIN_SENTENCES = 4;
const MAX_WORDS: Record<Level, number> = { 1: 3, 2: 4, 3: 99 };

/** «Το πουλί πετά .» → «Το», «πουλί», «πετά», «.»: the full stop is a piece too */
export function sentenceParts(s: Sentence): string[] {
  return s.tokens;
}

const isWord = (t: string) => /\p{L}/u.test(t);
const wordCount = (s: Sentence) => s.tokens.filter(isWord).length;

export function generateBuildSentence(ctx: GenerateContext): Round {
  const byText = new Map<string, Sentence>();
  for (const s of ctx.sentencePool) if (s.isTrueForImage && s.imageId) byText.set(sentenceText(s), s);
  const pool = [...byText.values()];
  if (pool.length < MIN_SENTENCES) throw new NotEnoughContent(`only ${pool.length} sentences`);

  const fitting = pool.filter((s) => wordCount(s) <= MAX_WORDS[ctx.level]);
  const source = fitting.length >= MIN_SENTENCES ? fitting : pool;
  const due = new Set(ctx.reviewQueue.filter((k) => k.startsWith('sentence:')).map((k) => k.slice('sentence:'.length)));
  const review = shuffle(source.filter((s) => due.has(s.id)), ctx.rng);
  const fresh = shuffle(source.filter((s) => !due.has(s.id)), ctx.rng);
  // every word on screen: the extra one comes from another readable sentence, never a capitalised first word
  const spareWords = [...new Set(pool.flatMap((s) => s.tokens.filter(isWord).slice(1)))];

  const items: OrderItem[] = [];
  const used = new Set<string>();
  for (let i = 0; i < ROUND_SIZE; i++) {
    const s = (!isEasyPosition(i) && review.find((r) => !used.has(r.id))) || fresh.find((f) => !used.has(f.id)) || shuffle(source, ctx.rng)[0]!;
    used.add(s.id);
    const parts = sentenceParts(s);
    const tiles: OrderTile[] = parts.map((text, k) => ({ id: String(k), text }));
    if (ctx.level === 3 && !isEasyPosition(i)) {
      const extra = shuffle(spareWords, ctx.rng).find((w) => !parts.some((p) => p.toLocaleLowerCase('el') === w.toLocaleLowerCase('el')));
      if (extra) tiles.push({ id: 'extra', text: extra });
    }
    let order = shuffle(tiles, ctx.rng);
    if (order.slice(0, parts.length).every((t, k) => t.text === parts[k])) order = [...order.slice(1), order[0]!];
    items.push({ wordId: '', sentenceId: s.id, text: sentenceText(s), imageId: s.imageId!, parts, tiles: order });
  }

  return { id: `${BUILD_SENTENCE_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: BUILD_SENTENCE_ID, seed: 0, level: ctx.level, items };
}
