// «Δίψηφο ή σύμπλεγμα;»: a word with consonants marked (μπ in «μπάλα», σπ in
// «σπίτι», στρ in «κάστρο»); the child says whether they make one sound (a
// digraph: μπ, ντ, γκ, γγ, τσ, τζ) or more (a cluster), as in the book's unit 4. The word is reading
// material: heard only on request, or slowly after a mistake.
// A cluster here is two or more single consonants at the start of one syllable
// (σπί-τι, κά-στρο), never letters split across syllables (πόρ-τα).

import greek from '../../content/greek.json' with { type: 'json' };
import { graphemes, tokenize } from '../../engine/greekTokenizer.ts';
import { detectFlags } from '../../engine/pronunciationFlags.ts';
import { shuffle } from '../../engine/rng.ts';
import type { Round, Word } from '../../engine/types.ts';
import { t } from '../../i18n.ts';
import { areTaught, isReadable, NotEnoughContent, ROUND_SIZE } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const DIGRAPH_ID = 'digraph';
export const ONE = 'one';
export const TWO = 'two';
/** the choice labels («δίψηφο», «σύμπλεγμα») are read too */
export const LABELS = { [ONE]: () => t('exercise.digraph.one'), [TWO]: () => t('exercise.digraph.two') };

const VOWELS = new Set(greek.vowels);
/** consonant digraphs: one sound written with two letters */
export const DIGRAPHS = new Set(greek.multigraphs.filter((m) => [...m].length === 2 && !VOWELS.has(m)));
const isConsonant = (g: string) => [...g].length === 1 && !VOWELS.has(g);

export interface DigraphItem {
  wordId: string;
  text: string;
  imageId?: string;
  /** the word as written, split around the marked letters */
  before: string;
  pair: string;
  after: string;
  target: typeof ONE | typeof TWO;
  options: [typeof ONE, typeof TWO];
}

interface Mark {
  word: Word;
  before: string;
  pair: string;
  after: string;
  kind: typeof ONE | typeof TWO;
}

/** Every marked pair a word offers, from its syllables as the school splits them. */
export function marksOf(word: Word): Mark[] {
  const tokens = word.syllables.map((s) => tokenize(s));
  const flat = tokens.flat();
  const surfaces = flat.map((tk) => tk.surface);
  const marks: Mark[] = [];
  const at = (from: number, len: number, kind: Mark['kind']) =>
    marks.push({ word, before: surfaces.slice(0, from).join(''), pair: surfaces.slice(from, from + len).join(''), after: surfaces.slice(from + len).join(''), kind });
  let offset = 0;
  for (const syl of tokens) {
    syl.forEach((tk, k) => {
      if (DIGRAPHS.has(tk.g)) at(offset + k, 1, ONE);
    });
    // the whole run of consonants: «στρ» in κά-στρο, not just «στ»
    let run = 0;
    while (run < syl.length - 1 && isConsonant(syl[run]!.g)) run++;
    if (run >= 2) at(offset, run, TWO);
    offset += syl.length;
  }
  return marks;
}

const readableLabel = (label: string, ctx: GenerateContext) =>
  areTaught(graphemes(label), ctx) && detectFlags(label).every((f) => ctx.unlockedFlags.has(f));

export function generateDigraph(ctx: GenerateContext): Round {
  if (!readableLabel(LABELS[ONE](), ctx) || !readableLabel(LABELS[TWO](), ctx)) throw new NotEnoughContent('labels not readable yet');
  const marks = ctx.wordPool.filter((w) => isReadable(w, ctx)).flatMap(marksOf);
  const one = shuffle(marks.filter((m) => m.kind === ONE), ctx.rng);
  const two = shuffle(marks.filter((m) => m.kind === TWO), ctx.rng);
  if (one.length < 2 || two.length < 2) throw new NotEnoughContent('too few digraphs or clusters');

  // at least two of each answer, never the same word twice
  const wants = shuffle([ONE, ONE, TWO, TWO, ctx.rng() < 0.5 ? ONE : TWO] as const, ctx.rng);
  const used = new Set<string>();
  const items: DigraphItem[] = [];
  for (const want of wants.slice(0, ROUND_SIZE)) {
    const from = want === ONE ? one : two;
    const m = from.find((x) => !used.has(x.word.id)) ?? from[0]!;
    used.add(m.word.id);
    items.push({ wordId: m.word.id, text: m.word.text, imageId: m.word.imageId, before: m.before, pair: m.pair, after: m.after, target: m.kind, options: [ONE, TWO] });
  }
  return { id: `${DIGRAPH_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: DIGRAPH_ID, seed: 0, level: ctx.level, items };
}
