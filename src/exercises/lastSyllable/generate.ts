// «Με ποια συλλαβή τελειώνει;»: picture + heard word, the child picks its last
// syllable among written ones. The mirror of «Με τι αρχίζει;», with syllables
// rather than phonemes (synthetic phonemes sound wrong). The word is not shown,
// so only the syllables on screen must be taught; they are shown without accent
// and none sounds like the answer.
// Levels: 3 choices; then 4; then the word's own first syllable is among them.

import { graphemes } from '../../engine/greekTokenizer.ts';
import { syllableSoundKey } from '../../engine/homophones.ts';
import { detectFlags } from '../../engine/pronunciationFlags.ts';
import { shuffle } from '../../engine/rng.ts';
import type { Flag, Round, Word } from '../../engine/types.ts';
import { syllableItemId } from '../answer.ts';
import { areTaught, isEasyPosition, NotEnoughContent, pickWords } from '../pool.ts';
import { withoutAccent } from '../stress/generate.ts';
import type { GenerateContext } from '../types.ts';
import { allowedSyllables } from '../whichSyllable/generate.ts';

export const LAST_SYLLABLE_ID = 'last-syllable';

export interface LastSyllableItem {
  wordId: string;
  text: string;
  imageId: string;
  /** the last syllable as written, without accent */
  target: string;
  options: string[];
}

// a few hundred syllables, looked at thousands of times: worked out once
const lastCache = new WeakMap<Word, string>();
const lastOf = (w: Word) => {
  let s = lastCache.get(w);
  if (s === undefined) lastCache.set(w, (s = withoutAccent(w.syllables.at(-1)!.toLocaleLowerCase('el'))));
  return s;
};
const partsCache = new Map<string, { gs: string[]; flags: string[]; sound: string }>();
const partsOf = (s: string) => {
  let p = partsCache.get(s);
  if (!p) partsCache.set(s, (p = { gs: graphemes(s), flags: detectFlags(s), sound: syllableSoundKey(s) }));
  return p;
};
const syllablesCache = new Map<string, string[]>();
const syllablesFor = (ctx: GenerateContext) => {
  const key = `${[...ctx.allowedGraphemes].join(',')}|${[...ctx.unlockedFlags].join(',')}`;
  let s = syllablesCache.get(key);
  if (!s) syllablesCache.set(key, (s = allowedSyllables(ctx)));
  return s;
};

/** a syllable may go on screen: taught letters, no locked pronunciation flag */
const showable = (s: string, ctx: GenerateContext) => {
  const p = partsOf(s);
  return areTaught(p.gs, ctx) && p.flags.every((f) => ctx.unlockedFlags.has(f as Flag));
};

export function generateLastSyllable(ctx: GenerateContext): Round {
  const pool = ctx.wordPool.filter((w) => w.imageId && w.syllables.length >= 2 && showable(lastOf(w), ctx));
  const words = pickWords(pool, ctx);
  const spare = [...new Set([...syllablesFor(ctx), ...pool.map(lastOf)])];

  const items: LastSyllableItem[] = words.map((w, i) => {
    const target = lastOf(w);
    const hard = ctx.level > 1 && !isEasyPosition(i);
    let others = shuffle(spare, ctx.rng);
    if (ctx.level === 3 && hard) {
      const first = withoutAccent(w.syllables[0]!.toLocaleLowerCase('el'));
      if (showable(first, ctx)) others = [first, ...others];
    }
    const count = (hard ? 4 : 3) - 1;
    const seen = new Set([partsOf(target).sound]);
    const wrong: string[] = [];
    for (const s of others) {
      if (wrong.length >= count) break;
      const sound = partsOf(s).sound;
      if (!seen.has(sound)) wrong.push(s), seen.add(sound);
    }
    if (wrong.length < 2) throw new NotEnoughContent('too few syllables that sound different');
    return { wordId: w.id, text: w.text, imageId: w.imageId!, target, options: shuffle([target, ...wrong], ctx.rng) };
  });

  return { id: `${LAST_SYLLABLE_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: LAST_SYLLABLE_ID, seed: 0, level: ctx.level, items };
}

export const lastSyllableItemId = (item: LastSyllableItem) => syllableItemId(syllableSoundKey(item.target));
