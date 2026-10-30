// The allowed-words rule, PRD §3. A word may reach the screen only if
// (1) all its graphemes are taught up to the current position, or it is a sight word, and
// (2) all its pronunciation flags are unlocked.
// Sight words are read as wholes, so they bypass both checks («έχει» has soft-g-ch).
// Diaeresis is a separate skill, locked until enabled.
//
// "Position" is the number of graphemes taught, counting along the book order of
// curriculum.json: 0 = transition only, 1 = first letter taught, and so on.

import { graphemes, lowerKey, splitWords, tokenize } from './greekTokenizer.ts';
import { detectFlags } from './pronunciationFlags.ts';
import type { Curriculum, Flag, Unit, Word } from './types.ts';

export const DIAERESIS_SKILL = 'diaeresis';

export interface GraphemeOrder {
  order: string[];
  /** grapheme -> position at which it becomes taught (1-based) */
  positionOf: Map<string, number>;
  /** unit id -> number of graphemes taught before the unit starts */
  unitStart: Map<number, number>;
}

export function graphemeOrder(curriculum: Curriculum): GraphemeOrder {
  const order: string[] = [];
  const positionOf = new Map<string, number>();
  const unitStart = new Map<number, number>();
  for (const unit of curriculum.units) {
    unitStart.set(unit.id, order.length);
    for (const g of unit.graphemes) {
      order.push(g);
      positionOf.set(g, order.length);
    }
  }
  return { order, positionOf, unitStart };
}

/** A unit is reached once its first grapheme is taught; units without graphemes once all before them are. */
export function unitReached(unit: Unit, order: GraphemeOrder, position: number): boolean {
  const start = order.unitStart.get(unit.id) ?? Infinity;
  return unit.graphemes.length > 0 ? position > start : position >= start;
}

/** Position from which these graphemes are all taught; Infinity if any is not in the curriculum. */
export function minPosition(gs: string[], order: GraphemeOrder): number {
  return gs.reduce((max, g) => Math.max(max, order.positionOf.get(g) ?? Infinity), 0);
}

/** Fills the computed fields of a Word. */
export function analyzeWord(word: Word, order: GraphemeOrder): Word & { graphemes: string[]; minPosition: number } {
  const gs = graphemes(word.text);
  return { ...word, graphemes: gs, minPosition: minPosition(gs, order) };
}

export interface Progress {
  position: number;
  /** flags the parent unlocked by hand */
  extraFlags?: Iterable<Flag>;
  /** skills the parent enabled by hand, e.g. "diaeresis" */
  extraSkills?: Iterable<string>;
}

export interface AllowContext {
  position: number;
  order: GraphemeOrder;
  unlockedFlags: Set<Flag>;
  skills: Set<string>;
  sightWords: Set<string>;
  /** word bank by lowercase NFC text, so hand-checked flags win over detection */
  words: Map<string, Word>;
}

export function makeContext(curriculum: Curriculum, progress: Progress, words: Word[] = []): AllowContext {
  const order = graphemeOrder(curriculum);
  const unlockedFlags = new Set<Flag>(progress.extraFlags ?? []);
  const skills = new Set<string>(progress.extraSkills ?? []);
  const sightWords = new Set<string>();
  for (const unit of curriculum.units) {
    if (!unitReached(unit, order, progress.position)) continue;
    unit.unlocksFlags.forEach((f) => unlockedFlags.add(f));
    unit.skills.forEach((s) => skills.add(s));
    unit.sightWords.forEach((w) => sightWords.add(lowerKey(w)));
  }
  return {
    position: progress.position,
    order,
    unlockedFlags,
    skills,
    sightWords,
    words: new Map(words.map((w) => [lowerKey(w.text), w])),
  };
}

export function isSightWord(text: string, ctx: AllowContext): boolean {
  return ctx.sightWords.has(lowerKey(text));
}

export function isWordAllowed(text: string, ctx: AllowContext): boolean {
  const key = lowerKey(text);
  if (ctx.sightWords.has(key)) return true;

  const tokens = tokenize(key);
  if (minPosition(tokens.map((t) => t.g), ctx.order) > ctx.position) return false;
  if (tokens.some((t) => t.diaeresis) && !ctx.skills.has(DIAERESIS_SKILL)) return false;

  const known = ctx.words.get(key);
  const flags = known ? known.flags : detectFlags(key);
  return flags.every((f) => ctx.unlockedFlags.has(f));
}

/** Checks every word in a piece of running text (sentence, choice label, key cap). */
export function isTextAllowed(text: string, ctx: AllowContext): boolean {
  return splitWords(text).every((w) => isWordAllowed(w, ctx));
}

export function allowedWords(words: Word[], ctx: AllowContext): Word[] {
  return words.filter((w) => isWordAllowed(w.text, ctx));
}
