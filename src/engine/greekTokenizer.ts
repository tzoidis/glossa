// Greek tokenizer, PRD §3. Steps, in order:
// 1. NFC  2. lowercase ('el')  3. greedy longest multigraph, then single letters;
//    an accent on the 1st vowel or a diaeresis on the 2nd cancels a vowel digraph
// 4. only then strip accents; final sigma counts as sigma; diaeresis is kept as a token property.

import greek from '../content/greek.json' with { type: 'json' };

export interface Token {
  g: string; // grapheme: lowercase, no accent, final sigma folded
  accent: boolean;
  diaeresis: boolean;
  /** as written, lowercase, with accent and final sigma (for letter tiles) */
  surface: string;
}

interface Char {
  base: string;
  raw: string;
  accent: boolean;
  diaeresis: boolean;
}

const ACUTE = '́';
const DIAERESIS = '̈';
const COMBINING = /[̀-ͯ]/g;

const MULTIGRAPHS = [...greek.multigraphs].sort((a, b) => b.length - a.length);
const VOWEL_DIGRAPHS = new Set(greek.vowelDigraphs);

export function normalizeText(text: string): string {
  return text.normalize('NFC');
}

export function lowerKey(text: string): string {
  return normalizeText(text).toLocaleLowerCase('el');
}

function toChars(lower: string): Char[] {
  const out: Char[] = [];
  for (const c of lower) {
    const d = c.normalize('NFD');
    let base = d.replace(COMBINING, '');
    const accent = d.includes(ACUTE);
    const diaeresis = d.includes(DIAERESIS);
    const prev = out[out.length - 1];
    if (base === '' && prev) {
      // stray combining mark that NFC could not compose: attach to previous letter
      prev.accent ||= accent;
      prev.diaeresis ||= diaeresis;
      prev.raw += c;
      continue;
    }
    if (base === greek.finalSigma) base = greek.sigma;
    out.push({ base, raw: c, accent, diaeresis });
  }
  return out;
}

function matchMultigraph(chars: Char[], i: number): string | null {
  for (const m of MULTIGRAPHS) {
    const len = [...m].length;
    if (i + len > chars.length) continue;
    const slice = chars.slice(i, i + len);
    if (slice.map((c) => c.base).join('') !== m) continue;
    if (VOWEL_DIGRAPHS.has(m) && (slice[0]!.accent || slice[1]!.diaeresis)) continue;
    return m;
  }
  return null;
}

/** Tokenizes a single word into graphemes. */
export function tokenize(word: string): Token[] {
  const chars = toChars(lowerKey(word));
  const tokens: Token[] = [];
  let i = 0;
  while (i < chars.length) {
    const m = matchMultigraph(chars, i);
    const len = m ? [...m].length : 1;
    const slice = chars.slice(i, i + len);
    tokens.push({
      g: m ?? slice[0]!.base,
      accent: slice.some((c) => c.accent),
      diaeresis: slice.some((c) => c.diaeresis),
      surface: slice.map((c) => c.raw).join(''),
    });
    i += len;
  }
  return tokens;
}

export function graphemes(word: string): string[] {
  return tokenize(word).map((t) => t.g);
}

/** Splits running text into words (letters and their combining marks). */
export function splitWords(text: string): string[] {
  return normalizeText(text).match(/[\p{L}\p{M}]+/gu) ?? [];
}

/** Graphemes as written (lowercase, accents kept): «πίτα» → π, ί, τ, α. */
export function surfaceGraphemes(word: string): string[] {
  return tokenize(word).map((t) => t.surface);
}
