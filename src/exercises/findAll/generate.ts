// «Βρες όλες»: a syllable clip plays («πα»), the child taps every picture whose
// word has that syllable anywhere (πα-πού-τσι, κα-πα-ρι). No text on screen, so
// any word with a picture works, as in «Πόσες συλλαβές;»; tapping a picture says
// its word. Syllables are compared by sound (syllableSoundKey: «πά», «πα» alike).
// A wrong picture never has the sound anywhere, not even inside a closed syllable
// («μος» in κόσ-μος for «μο»), so what the child hears is always a fair answer.
// Levels: 4 pictures, 2 to find; then 6 pictures, 2-3 to find; then wrong
// pictures share the consonant or the vowel («πο», «τα» for «πα»).

import greek from '../../content/greek.json' with { type: 'json' };
import { graphemes } from '../../engine/greekTokenizer.ts';
import { syllableSoundKey } from '../../engine/homophones.ts';
import { pick, shuffle } from '../../engine/rng.ts';
import type { Round, Word } from '../../engine/types.ts';
import { syllableItemId } from '../answer.ts';
import { isEasyPosition, NotEnoughContent, ROUND_SIZE } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const FIND_ALL_ID = 'find-all';
const MAX_PICTURES = 6;
/** fewer syllables than this and the round would repeat them */
const MIN_TARGETS = 3;

export interface FindAllItem {
  /** sound key of the syllable heard, e.g. «πα» */
  target: string;
  /** word ids of the pictures, in screen order */
  options: string[];
  /** the word ids that have the syllable */
  answers: string[];
}

const VOWELS = new Set(greek.vowels);

// a few hundred distinct syllables, asked about thousands of times per round
const partsCache = new Map<string, string[]>();
function parts(key: string): string[] {
  let gs = partsCache.get(key);
  if (!gs) partsCache.set(key, (gs = graphemes(key)));
  return gs;
}

/** consonant + vowel, the syllables a clip can say cleanly */
function isOpenSyllable(key: string): boolean {
  const gs = parts(key);
  return gs.length === 2 && !VOWELS.has(gs[0]!) && VOWELS.has(gs[1]!);
}

interface Candidate {
  key: string;
  hits: Word[];
  misses: Word[];
}

// the same for every round of a word bank: worked out once
const cache = new WeakMap<Word[], Candidate[]>();
const soundKeys = new WeakMap<Word, string[]>();
const keysOf = (w: Word) => {
  let keys = soundKeys.get(w);
  if (!keys) soundKeys.set(w, (keys = w.syllables.map(syllableSoundKey)));
  return keys;
};

function candidates(bank: Word[]): Candidate[] {
  const cached = cache.get(bank);
  if (cached) return cached;
  const pool = distinctImages(bank.filter((w) => w.imageId));
  const spoken = new Map(pool.map((w) => [w, keysOf(w).join('')]));
  const keys = new Set(pool.flatMap(keysOf).filter(isOpenSyllable));
  const result = [...keys].map((key) => ({
    key,
    hits: pool.filter((w) => keysOf(w).includes(key)),
    misses: pool.filter((w) => !spoken.get(w)!.includes(key)),
  }));
  cache.set(bank, result);
  return result;
}

/** one word per image: two words drawn alike would confuse */
function distinctImages(words: Word[]): Word[] {
  const seen = new Set<string>();
  return words.filter((w) => !seen.has(w.imageId!) && seen.add(w.imageId!));
}

const consonantOf = (key: string) => parts(key)[0]!;
const vowelOf = (key: string) => parts(key)[1]!;

export function generateFindAll(ctx: GenerateContext): Round {
  const usable = candidates(ctx.wordPool).filter((c) => c.hits.length >= 3 && c.misses.length >= MAX_PICTURES);
  if (usable.length < MIN_TARGETS) throw new NotEnoughContent('fewer than 3 syllables in enough pictured words');

  // syllables of the letters taught so far come first: the book's sounds of the week
  const taughtSounds = new Set([...ctx.allowedGraphemes].map(syllableSoundKey));
  const taught = usable.filter((c) => parts(c.key).every((g) => taughtSounds.has(g)));
  const preferred = taught.length >= MIN_TARGETS ? taught : usable;
  const due = new Set(ctx.reviewQueue.filter((k) => k.startsWith('syllable:')).map((k) => k.slice('syllable:'.length)));
  const review = shuffle(
    usable.filter((c) => due.has(c.key)),
    ctx.rng,
  ).slice(0, 2);
  const recent = new Set(ctx.recentWordIds);

  const used: string[] = [];
  const items: FindAllItem[] = [];
  for (let i = 0; i < ROUND_SIZE; i++) {
    const easy = ctx.level === 1 || isEasyPosition(i);
    const fromReview = !isEasyPosition(i) ? review.shift() : undefined;
    const fresh = preferred.filter((c) => !used.includes(c.key));
    const c = fromReview ?? pick(fresh.length ? fresh : preferred, ctx.rng);
    used.push(c.key);

    const size = easy ? 4 : MAX_PICTURES;
    const found = easy ? 2 : 2 + Math.floor(ctx.rng() * 2);
    // words not seen lately first (PRD §5), then the rest
    const byRecency = (ws: Word[]) => {
      const s = shuffle(ws, ctx.rng);
      return [...s.filter((w) => !recent.has(w.id)), ...s.filter((w) => recent.has(w.id))];
    };
    let misses = byRecency(c.misses);
    if (ctx.level === 3 && !easy) {
      const close = (w: Word) =>
        keysOf(w).some((k) => isOpenSyllable(k) && (consonantOf(k) === consonantOf(c.key) || vowelOf(k) === vowelOf(c.key)));
      misses = [...misses.filter(close), ...misses.filter((w) => !close(w))];
    }
    const answers = byRecency(c.hits).slice(0, found);
    const options = shuffle([...answers, ...misses.slice(0, size - found)], ctx.rng);
    items.push({ target: c.key, options: options.map((w) => w.id), answers: answers.map((w) => w.id) });
  }

  return { id: `${FIND_ALL_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: FIND_ALL_ID, seed: 0, level: ctx.level, items };
}

export const findAllItemId = (item: FindAllItem) => syllableItemId(item.target);
