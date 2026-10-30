// Detects the pronunciation flags of PRD §3 from graphemes. validate-content checks
// that hand-written Word.flags match; for free text (sentence words not in the bank)
// this is the only source, so the synizesis fallback errs on the strict side.

import greek from '../content/greek.json' with { type: 'json' };
import { tokenize, type Token } from './greekTokenizer.ts';
import { ALL_FLAGS, type Flag } from './types.ts';

const VOWELS = new Set(greek.vowels);
const GLIDES = new Set(greek.synizesisGlides);
const SOFT = new Set(greek.softConsonants);
const FRONT = new Set(greek.frontVowels);
const VOICED_AFTER_SIGMA = new Set(greek.voicedAfterSigma);

const isLetter = (g: string) => /^\p{L}+$/u.test(g);
const isConsonant = (g: string) => isLetter(g) && !VOWELS.has(g);

function glideBeforeVowel(tokens: Token[], requireUnaccented: boolean): boolean {
  return tokens.some((t, i) => {
    const next = tokens[i + 1];
    return GLIDES.has(t.g) && !!next && VOWELS.has(next.g) && !(requireUnaccented && t.accent);
  });
}

/**
 * With syllables, synizesis means a glide and a vowel share a syllable (πο-τή-ρια).
 * Without them, any unaccented glide before a vowel counts (may over-flag: safe).
 */
export function detectFlags(word: string, syllables?: string[]): Flag[] {
  const tokens = tokenize(word);
  const found = new Set<Flag>();

  tokens.forEach((t, i) => {
    const next = tokens[i + 1]?.g;
    if (next === undefined) return;
    if (isConsonant(t.g) && isConsonant(next)) found.add(t.g === next ? 'double-consonant' : 'cluster');
    if (SOFT.has(t.g) && FRONT.has(next)) found.add('soft-g-ch');
    if (t.g === greek.sigma && VOICED_AFTER_SIGMA.has(next)) found.add('s-as-z');
  });

  const synizesis = syllables
    ? syllables.some((s) => glideBeforeVowel(tokenize(s), false))
    : glideBeforeVowel(tokens, true);
  if (synizesis) found.add('synizesis');

  return ALL_FLAGS.filter((f) => found.has(f));
}
