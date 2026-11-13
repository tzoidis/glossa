// «Ποιο γράφεται σωστά;»: two spellings that sound the same, the child picks the
// right one (PRD §4, only rules the book teaches). Units 5-6: the ending of a noun
// follows its article (η μύτη, not μύτι; το μάτι, not μάτη; ο λύκος, not λύκως),
// and the verb endings -ω, -εις, -ει (εγώ έχω, εσύ έχεις, αυτός έχει).
// Levels: 1 nouns, with their picture; 2 and 3 nouns and verbs.

import greek from '../../content/greek.json' with { type: 'json' };
import verbs from '../../content/verbs.json' with { type: 'json' };
import { graphemes, splitWords } from '../../engine/greekTokenizer.ts';
import { detectFlags } from '../../engine/pronunciationFlags.ts';
import { shuffle } from '../../engine/rng.ts';
import type { Round, Word } from '../../engine/types.ts';
import { areTaught, isEasyPosition, isReadable, NotEnoughContent, pickWords } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const SPELLING_ID = 'spelling';

export interface SpellingItem {
  /** set for a noun: its picture and clip */
  wordId?: string;
  imageId?: string;
  /** the article or the pronoun in front */
  lead: string;
  target: string;
  options: string[];
}

// the final vowel and the one that sounds the same, accent kept (greek.json)
const SWAP: Record<string, string> = greek.endingTwins;
const VOWELS = new Set(greek.vowels);
const isVowel = (c: string) => VOWELS.has(c.normalize('NFD').replace(/\p{M}/gu, ''));

/** The same word with its ending misspelt the way it sounds; null if the ending has no such twin. */
export function misspeltEnding(text: string): string | null {
  const chars = [...text];
  // -ος, -ης: the vowel before the final ς
  const i = chars.at(-1) === greek.finalSigma ? chars.length - 2 : chars.length - 1;
  const c = chars[i];
  if (!c || !SWAP[c]) return null;
  // part of a digraph (ου, ει, οι): spelt as a pair, not this rule
  if (i > 0 && isVowel(chars[i - 1]!)) return null;
  chars[i] = SWAP[c]!;
  return chars.join('');
}

/** one pronoun per ending (greek.json verbEndings): the ending as it sounds, written wrong */
function verbItems(): { lead: string; right: string; wrong: string }[] {
  return verbs.verbs.flatMap((lemma) => {
    const stem = lemma.slice(0, -1);
    return greek.verbEndings.map(([right, wrong], k) => ({ lead: verbs.pronouns[k]!, right: stem + right, wrong: stem + wrong }));
  });
}

const VERB_ITEMS = verbItems();

/** every word of «εγώ έχω» readable: taught letters, unlocked flags */
const readable = (text: string, ctx: GenerateContext) =>
  splitWords(text).every((w) => areTaught(graphemes(w), ctx) && detectFlags(w).every((f) => ctx.unlockedFlags.has(f)));

export function generateSpelling(ctx: GenerateContext): Round {
  const nouns = ctx.wordPool.filter((w) => w.article && w.imageId && misspeltEnding(w.text) && isReadable(w, ctx));
  const verbPool = VERB_ITEMS.filter((v) => readable(`${v.lead} ${v.right}`, ctx));
  if (nouns.length < 3) throw new NotEnoughContent('too few nouns with a twin ending');

  const nounItem = (w: Word): SpellingItem => ({
    wordId: w.id,
    imageId: w.imageId,
    lead: w.article!,
    target: w.text,
    options: shuffle([w.text, misspeltEnding(w.text)!], ctx.rng),
  });
  const verbsShuffled = shuffle(verbPool, ctx.rng);
  const items = pickWords(nouns, ctx).map((w, i) => {
    // from level 2 the middle questions are verbs
    const v = ctx.level > 1 && !isEasyPosition(i) ? verbsShuffled.shift() : undefined;
    return v ? { lead: v.lead, target: v.right, options: shuffle([v.right, v.wrong], ctx.rng) } : nounItem(w);
  });
  return { id: `${SPELLING_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: SPELLING_ID, seed: 0, level: ctx.level, items };
}
