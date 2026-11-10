// «Αλφαβητική σειρά»: shuffled letters to put in the order of the alphabet,
// through the shared drag-or-tap OrderExercise. PRD §4: from unit 4, when the
// whole alphabet is known. Nothing is heard: letters are not words, and letter
// names are never spoken by the device voice.
// Levels: 1 three letters; 2 four; 3 five, and mid-round three words to order
// by their first letter.

import greek from '../../content/greek.json' with { type: 'json' };
import { shuffle } from '../../engine/rng.ts';
import type { Level, Round, Word } from '../../engine/types.ts';
import { isEasyPosition, isReadable, NotEnoughContent, ROUND_SIZE, wordGraphemes } from '../pool.ts';
import type { OrderItem, OrderTile } from '../shared/OrderExercise.tsx';
import type { GenerateContext } from '../types.ts';

export const ALPHABET_ID = 'alphabet';
const LETTERS: Record<Level, number> = { 1: 3, 2: 4, 3: 5 };
const WORDS = 3;
const ORDER = new Map(greek.alphabet.map((g, i) => [g, i]));

const byAlphabet = (a: string, b: string) => ORDER.get(a)! - ORDER.get(b)!;

function itemOf(parts: string[], ctx: GenerateContext): OrderItem {
  let tiles: OrderTile[] = shuffle(
    parts.map((text, k) => ({ id: String(k), text })),
    ctx.rng,
  );
  // never hand the child an already-solved row
  if (tiles.every((t, k) => t.text === parts[k])) tiles = [...tiles.slice(1), tiles[0]!];
  return { wordId: '', itemId: `${ALPHABET_ID}:${parts.join(',')}`, text: parts.join(' '), parts, tiles };
}

export function generateAlphabet(ctx: GenerateContext): Round {
  const letters = greek.alphabet.filter((g) => ctx.allowedGraphemes.has(g));
  if (letters.length < LETTERS[3] + 1) throw new NotEnoughContent('too few letters');
  // words whose first grapheme is a single letter, one word per first letter
  const firstOf = (w: Word) => wordGraphemes(w)[0]!;
  const words = shuffle(
    ctx.wordPool.filter((w) => ORDER.has(firstOf(w)) && isReadable(w, ctx)),
    ctx.rng,
  ).filter((w, i, all) => all.findIndex((o) => firstOf(o) === firstOf(w)) === i);

  const items: OrderItem[] = [];
  for (let i = 0; i < ROUND_SIZE; i++) {
    if (ctx.level === 3 && !isEasyPosition(i) && words.length >= WORDS) {
      const chosen = words.splice(0, WORDS).sort((a, b) => byAlphabet(firstOf(a), firstOf(b)));
      items.push(itemOf(chosen.map((w) => w.text), ctx));
      continue;
    }
    items.push(itemOf(shuffle(letters, ctx.rng).slice(0, LETTERS[ctx.level]).sort(byAlphabet), ctx));
  }
  return { id: `${ALPHABET_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: ALPHABET_ID, seed: 0, level: ctx.level, items };
}
