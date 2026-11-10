// «Υπαγόρευση»: the word is heard (and its picture shown); the child writes it on
// a keyboard that has only the letters taught so far (PRD §4, from unit 3).
// Fair words first: at levels 1-2 only words where every sound has one spelling
// among the taught letters, so «πόδι» does not come up once ι and η are both
// known. The accent is not typed: the word shows with it once written. A final
// σ turns into ς by itself.
// Levels: 1 fair words up to 5 letters; 2 fair words of any length; 3 any word.

import greek from '../../content/greek.json' with { type: 'json' };
import { lowerKey } from '../../engine/greekTokenizer.ts';
import type { Round, Word } from '../../engine/types.ts';
import { isReadable, MIN_DISTINCT_WORDS, NotEnoughContent, pickWords, wordGraphemes } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const DICTATION_ID = 'dictation';
const SHORT = 5;

export interface DictationItem {
  wordId: string;
  text: string;
  imageId: string;
  /** the letters to type: lower case, no accent, final sigma as σ */
  letters: string[];
  /** the keyboard: taught letters in alphabetical order */
  keys: string[];
}

const HOMOPHONES = greek.homophones.map((g) => new Set(g));

/** «πίτα» → π, ι, τ, α: what the child types for a word. */
export function lettersOf(text: string): string[] {
  const plain = lowerKey(text).normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
  return [...plain].map((c) => (c === greek.finalSigma ? greek.sigma : c));
}

/** Every sound of the word has a single spelling among the taught graphemes. */
export function isFair(w: Word, ctx: GenerateContext): boolean {
  return wordGraphemes(w).every((g) => {
    const group = HOMOPHONES.find((h) => h.has(g));
    return !group || [...group].every((o) => o === g || !ctx.allowedGraphemes.has(o));
  });
}

export function keyboardFor(ctx: GenerateContext): string[] {
  const taught = new Set([...ctx.allowedGraphemes].flatMap((g) => [...g]));
  return greek.alphabet.filter((g) => taught.has(g));
}

export function generateDictation(ctx: GenerateContext): Round {
  const sigmaTaught = ctx.allowedGraphemes.has(greek.sigma);
  const readable = ctx.wordPool.filter((w) => w.imageId && isReadable(w, ctx) && (sigmaTaught || !lettersOf(w.text).includes(greek.sigma)));
  const fair = readable.filter((w) => isFair(w, ctx));
  const levelPool =
    ctx.level === 1 ? fair.filter((w) => lettersOf(w.text).length <= SHORT) : ctx.level === 2 ? fair : readable;
  const pool = levelPool.length >= MIN_DISTINCT_WORDS ? levelPool : fair;
  if (pool.length < MIN_DISTINCT_WORDS) throw new NotEnoughContent(`only ${pool.length} fair words`);

  const keys = keyboardFor(ctx);
  const items: DictationItem[] = pickWords(pool, ctx).map((w) => ({
    wordId: w.id,
    text: w.text,
    imageId: w.imageId!,
    letters: lettersOf(w.text),
    keys,
  }));
  return { id: `${DICTATION_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: DICTATION_ID, seed: 0, level: ctx.level, items };
}
