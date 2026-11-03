// Progress for the parent screen (PRD §7, phase 2): first-attempt accuracy and
// play time per unit over the last 7 days, the hardest letters and words, how
// often reading material was listened to, and frequent confusions. Pure: the
// answers come in, the summary goes out.

import type { Content } from '../../app/content.ts';
import { isTextAllowed, makeContext } from '../../engine/allowedWords.ts';
import type { AnswerLog } from '../../engine/types.ts';
import { sentenceText } from '../../exercises/trueFalse/generate.ts';

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TOP_LETTERS = 5;
const TOP_WORDS = 10;
const TOP_CONFUSIONS = 5;

export interface UnitStats {
  unitId: number;
  firstAttempts: number;
  correct: number;
  /** time spent answering, from each answer's latency */
  ms: number;
}

export interface Hard {
  /** review-queue key, e.g. word:pie or grapheme:<g> */
  key: string;
  text: string;
  mistakes: number;
  tries: number;
}

export interface Confusion {
  target: string;
  given: string;
  count: number;
}

export interface ProgressSummary {
  units: UnitStats[];
  letters: Hard[];
  words: Hard[];
  listened: number;
  confusions: Confusion[];
  firstAttempts: number;
}

/** What an answer was about, as text on the scale of the allowed-words rule. */
export function itemText(itemId: string, content: Content): string | null {
  const [kind, id, q] = itemId.split(':');
  if (!id) return null;
  if (kind === 'grapheme' || kind === 'syllable') return id;
  if (kind === 'word') return content.wordsById.get(id)?.text ?? null;
  if (kind === 'sentence') {
    const s = content.sentences.find((x) => x.id === id);
    return s ? sentenceText(s) : null;
  }
  if (kind === 'story') {
    const s = content.stories.find((x) => x.id === id);
    return s ? [...s.sentences, s.questions[Number(q)]?.prompt ?? ''].join(' ') : null;
  }
  return null;
}

/** The unit whose letters make the text readable (sight words and unit flags included). */
export function unitOfText(text: string, content: Content, cache = new Map<string, number>()): number {
  const known = cache.get(text);
  if (known !== undefined) return known;
  const last = content.order.order.length;
  let position = 0;
  while (position < last && !isTextAllowed(text, makeContext(content.curriculum, { position }, content.words))) position++;
  const unit = position === 0 ? 0 : (content.curriculum.units.find((u) => {
    const start = content.order.unitStart.get(u.id) ?? Infinity;
    return u.graphemes.length > 0 && position > start && position <= start + u.graphemes.length;
  })?.id ?? 0);
  cache.set(text, unit);
  return unit;
}

// Greek letters only: other targets are ids (word ids, picture codes, yes/no)
const isLetters = (s: string) => /^\p{Script=Greek}{1,4}$/u.test(s);
/** a child who walks away mid-question does not count as an hour of play */
const MAX_ANSWER_MS = 60_000;

export function summarize(answers: AnswerLog[], content: Content, now: number, cache = new Map<string, number>()): ProgressSummary {
  const recent = answers.filter((a) => a.ts > now - WEEK_MS);
  const first = recent.filter((a) => a.attempt === 1);

  const units = new Map<number, UnitStats>();
  for (const a of recent) {
    const text = itemText(a.itemId, content);
    if (text === null) continue;
    const id = unitOfText(text, content, cache);
    const u = units.get(id) ?? { unitId: id, firstAttempts: 0, correct: 0, ms: 0 };
    u.ms += Math.min(a.latencyMs, MAX_ANSWER_MS);
    if (a.attempt === 1) {
      u.firstAttempts++;
      if (a.correct) u.correct++;
    }
    units.set(id, u);
  }

  const hardest = (prefixes: string[], limit: number): Hard[] => {
    const byKey = new Map<string, Hard>();
    for (const a of first) {
      if (!prefixes.some((p) => a.itemId.startsWith(p))) continue;
      const text = itemText(a.itemId, content);
      if (text === null) continue;
      const h = byKey.get(a.itemId) ?? { key: a.itemId, text, mistakes: 0, tries: 0 };
      h.tries++;
      if (!a.correct) h.mistakes++;
      byKey.set(a.itemId, h);
    }
    return [...byKey.values()]
      .filter((h) => h.mistakes > 0)
      .sort((x, y) => y.mistakes - x.mistakes || y.mistakes / y.tries - x.mistakes / x.tries)
      .slice(0, limit);
  };

  // picks omega for omicron: wrong letters or syllables chosen in place of the right one
  const pairs = new Map<string, Confusion>();
  for (const a of first) {
    if (a.correct || !isLetters(a.target) || !isLetters(a.given) || a.target === a.given) continue;
    const k = `${a.target}>${a.given}`;
    const c = pairs.get(k) ?? { target: a.target, given: a.given, count: 0 };
    c.count++;
    pairs.set(k, c);
  }

  return {
    units: [...units.values()].sort((a, b) => a.unitId - b.unitId),
    letters: hardest(['grapheme:', 'syllable:'], TOP_LETTERS),
    words: hardest(['word:'], TOP_WORDS),
    listened: recent.filter((a) => a.usedListen && a.attempt === 1).length,
    confusions: [...pairs.values()].sort((a, b) => b.count - a.count).slice(0, TOP_CONFUSIONS),
    firstAttempts: first.length,
  };
}
