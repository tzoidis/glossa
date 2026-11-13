// «Δικές μου λέξεις» (PRD §7): reading what the parent typed, and when the word
// reaches the games. Pure, so it is tested without a screen.

import greek from '../../content/greek.json' with { type: 'json' };
import { NAMES, type Content } from '../../app/content.ts';
import { isTextAllowed, makeContext } from '../../engine/allowedWords.ts';
import { graphemes, lowerKey, normalizeText, tokenize } from '../../engine/greekTokenizer.ts';
import type { Word } from '../../engine/types.ts';

export type Kind = 'name' | 'word';

export type Parsed =
  | { ok: true; text: string; syllables: string[]; listed?: Word; warn?: 'hyphens' | 'accent' }
  | { ok: false; error: 'invalid' | 'empty' };

const VOWELS = new Set(greek.vowels);
const LETTERS_AND_HYPHENS = /^[\p{Script=Greek}-]+$/u;
const ACCENT = /[́̈́]/u;

/** lower case, no accents or hyphens: on a tablet names are often typed without the accent */
const nameKey = (s: string) => lowerKey(s.replace(/-/g, '').trim()).normalize('NFD').replace(/\p{M}/gu, '');
const NAMES_BY_TEXT = new Map(NAMES.map((n) => [nameKey(n.text), n]));

/** A name from the list, however it was typed (capitals, no accent, NFD, with the hyphens). */
export function listedName(input: string): Word | undefined {
  return NAMES_BY_TEXT.get(nameKey(input));
}

const capitalize = (s: string) => (s ? s[0]!.toLocaleUpperCase('el') + s.slice(1) : s);

/**
 * «σκυ-λά-κι» → σκυλάκι in 3 syllables. A name gets its capital, a word is lower case.
 * Warns (without refusing) about one long syllable or a missing accent.
 */
export function parseInput(input: string, kind: Kind): Parsed {
  const raw = normalizeText(input).trim();
  if (!raw) return { ok: false, error: 'empty' };
  if (kind === 'name') {
    const listed = listedName(raw);
    if (listed) return { ok: true, text: listed.text, syllables: listed.syllables, listed };
  }
  if (!LETTERS_AND_HYPHENS.test(raw)) return { ok: false, error: 'invalid' };
  const parts = raw.split('-').filter(Boolean);
  if (parts.length === 0) return { ok: false, error: 'invalid' };
  const lower = parts.map((p) => p.toLocaleLowerCase('el'));
  const syllables = kind === 'name' ? [capitalize(lower[0]!), ...lower.slice(1)] : lower;
  const text = syllables.join('');
  const vowelGroups = tokenize(text).filter((t) => VOWELS.has(t.g)).length;
  const warn = syllables.length === 1 && vowelGroups > 1 ? 'hyphens' : syllables.length > 1 && !ACCENT.test(text.normalize('NFD')) ? 'accent' : undefined;
  return { ok: true, text, syllables, ...(warn ? { warn } : {}) };
}

/** Already a bank word, a name in the list the parent added, or one of their own words. */
export function isTaken(text: string, content: Content): boolean {
  const key = lowerKey(text);
  return content.words.some((w) => lowerKey(w.text) === key);
}

export type WhenReadable = { now: true } | { now: false; grapheme: string } | { now: false; unit: number } | { now: false; never: true };

/** When the word reaches the games: now, or the letter (or thematic unit) that unlocks it. */
export function whenReadable(text: string, position: number, content: Content, allowNow: Parameters<typeof isTextAllowed>[1]): WhenReadable {
  if (isTextAllowed(text, allowNow)) return { now: true };
  const { order, maxPosition, thematic, unitStart } = content.order;
  for (let p = position + 1; p <= maxPosition; p++) {
    if (!isTextAllowed(text, makeContext(content.curriculum, { position: p }, content.words))) continue;
    if (p <= order.length) {
      const g = order[p - 1]!;
      if (graphemes(text).includes(g)) return { now: false, grapheme: g };
      // unlocked by the unit, not by its first letter (a pronunciation flag: «σκ» waits for unit 4)
      const unit = content.curriculum.units.find((u) => {
        const start = unitStart.get(u.id) ?? Infinity;
        return u.graphemes.length > 0 && p > start && p <= start + u.graphemes.length;
      });
      return unit ? { now: false, unit: unit.id } : { now: false, grapheme: g };
    }
    // a thematic unit is reached at the position just after its start
    const unit = [...thematic].find((u) => unitStart.get(u) === p - 1);
    return unit === undefined ? { now: false, never: true } : { now: false, unit };
  }
  return { now: false, never: true };
}
