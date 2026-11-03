// Pure checks behind `npm run validate-content` (PRD §8 "Έλεγχοι").
// The script reads the files; everything here is unit-testable.

import greek from '../content/greek.json' with { type: 'json' };
import { graphemeOrder, isWordAllowed, makeContext, minPosition, type GraphemeOrder } from './allowedWords.ts';
import { graphemes, normalizeText, splitWords } from './greekTokenizer.ts';
import { soundOf } from './homophones.ts';
import { detectFlags } from './pronunciationFlags.ts';
import { ALL_FLAGS, type Curriculum, type Flag, type Sentence, type Story, type Word } from './types.ts';

export interface Content {
  curriculum: Curriculum;
  words: Word[];
  sentences: Sentence[];
  stories: Story[];
}

const ARTICLES = new Set<string | null>([...greek.articles, null]);

function outsideCurriculum(text: string, order: GraphemeOrder): string[] {
  return graphemes(text).filter((g) => /\p{L}/u.test(g) && !order.positionOf.has(g));
}

export function validateCurriculum(curriculum: Curriculum): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const unit of curriculum.units) {
    for (const g of unit.graphemes) {
      if (seen.has(g)) errors.push(`curriculum unit ${unit.id}: grapheme "${g}" repeated`);
      seen.add(g);
      const t = graphemes(g);
      if (t.length !== 1 || t[0] !== g) errors.push(`curriculum unit ${unit.id}: "${g}" is not a single tokenizer grapheme (got ${JSON.stringify(t)})`);
    }
    for (const f of unit.unlocksFlags) {
      if (!ALL_FLAGS.includes(f)) errors.push(`curriculum unit ${unit.id}: unknown flag "${f}"`);
    }
  }
  return errors;
}

export function validateWords(words: Word[], curriculum: Curriculum): string[] {
  const errors: string[] = [];
  const order = graphemeOrder(curriculum);
  const ids = new Set<string>();
  const texts = new Set<string>();

  for (const w of words) {
    const at = `word ${w.id ?? '?'} «${w.text}»`;
    if (!w.id) errors.push(`${at}: missing id`);
    if (ids.has(w.id)) errors.push(`${at}: duplicate id`);
    ids.add(w.id);
    const key = normalizeText(w.text).toLocaleLowerCase('el');
    if (texts.has(key)) errors.push(`${at}: duplicate text`);
    texts.add(key);

    if (!ARTICLES.has(w.article)) errors.push(`${at}: bad article ${JSON.stringify(w.article)}`);
    if (!w.category) errors.push(`${at}: missing category`);
    if (!w.imageId) errors.push(`${at}: missing imageId`);
    else if (!/^[0-9A-F]{4,6}(-[0-9A-F]{4,6})*$/.test(w.imageId)) errors.push(`${at}: imageId "${w.imageId}" is not an OpenMoji code (e.g. 1F34E)`);
    if (w.graphemes !== undefined || w.minPosition !== undefined) {
      errors.push(`${at}: graphemes/minPosition are computed, do not write them by hand`);
    }

    if (!Array.isArray(w.syllables) || w.syllables.length === 0) {
      errors.push(`${at}: missing syllables`);
    } else {
      if (w.syllables.join('') !== w.text) errors.push(`${at}: syllables ${JSON.stringify(w.syllables)} do not join to the word`);
      const fromSyllables = w.syllables.flatMap((s) => graphemes(s));
      if (fromSyllables.join('|') !== graphemes(w.text).join('|')) {
        errors.push(`${at}: syllables split a grapheme (${fromSyllables.join(' ')} vs ${graphemes(w.text).join(' ')})`);
      }
    }

    const unknown = w.flags.filter((f) => !ALL_FLAGS.includes(f));
    if (unknown.length) errors.push(`${at}: unknown flags ${unknown.join(', ')}`);
    const expected = detectFlags(w.text, w.syllables);
    const given = ALL_FLAGS.filter((f) => w.flags.includes(f));
    if (expected.join() !== given.join()) {
      errors.push(`${at}: flags ${JSON.stringify(given)} but detected ${JSON.stringify(expected)} (ask before changing)`);
    }

    const missing = outsideCurriculum(w.text, order);
    if (missing.length) errors.push(`${at}: graphemes not in curriculum: ${missing.join(', ')}`);
  }
  return errors;
}

export function validateTexts(sentences: Sentence[], stories: Story[], curriculum: Curriculum): string[] {
  const errors: string[] = [];
  const order = graphemeOrder(curriculum);
  const check = (at: string, text: string) => {
    if (splitWords(text).length === 0 && /\p{L}/u.test(text)) errors.push(`${at}: unreadable text`);
    const missing = outsideCurriculum(text, order);
    if (missing.length) errors.push(`${at}: graphemes not in curriculum: ${missing.join(', ')}`);
  };
  for (const s of sentences) {
    if (!s.tokens?.length) errors.push(`sentence ${s.id}: no tokens`);
    s.tokens?.forEach((t) => check(`sentence ${s.id}`, t));
  }
  for (const st of stories) {
    st.sentences.forEach((s) => check(`story ${st.id}`, s));
    st.questions.forEach((q, i) => {
      check(`story ${st.id} question ${i}`, q.prompt);
      if (q.answer < 0 || q.answer >= q.imageChoices.length) errors.push(`story ${st.id} question ${i}: answer out of range`);
    });
  }
  return errors;
}

// ---------- capacity ----------

export interface CapacityRule {
  from: number;
  shows: 'none' | 'first-grapheme' | 'word' | 'graphemes';
  needsImage?: boolean;
  minSyllables?: number;
  minLetters?: number;
  maxLetters?: number;
}

export interface CapacityConfig {
  minWords: number;
  /** minimum distinct-sounding choices for grapheme exercises */
  minChoices: number;
  /** positions where every applicable exercise must reach the minimum */
  checkpoints: number[];
  exercises: Record<string, CapacityRule>;
}

/** Items available to one exercise at one position; null if the exercise has not started yet. */
export function capacityAt(rule: CapacityRule, position: number, curriculum: Curriculum, words: Word[], unlockedFlags: Flag[] = []): number | null {
  if (position < rule.from) return null;
  const ctx = makeContext(curriculum, { position, extraFlags: unlockedFlags }, words);

  if (rule.shows === 'graphemes') {
    return new Set(ctx.order.order.slice(0, position).map(soundOf)).size;
  }
  return words.filter((w) => {
    const gs = graphemes(w.text);
    if (rule.needsImage && !w.imageId) return false;
    if (rule.minSyllables && w.syllables.length < rule.minSyllables) return false;
    if (rule.minLetters && gs.length < rule.minLetters) return false;
    if (rule.maxLetters && gs.length > rule.maxLetters) return false;
    if (rule.shows === 'first-grapheme') return minPosition(gs.slice(0, 1), ctx.order) <= position;
    if (rule.shows === 'word') return isWordAllowed(w.text, ctx);
    return true;
  }).length;
}

export interface CapacityRow {
  position: number;
  label: string;
  counts: Record<string, number | null>;
}

/** Capacity at the end of every unit that teaches graphemes, plus any checkpoints. */
export function capacityTable(config: CapacityConfig, curriculum: Curriculum, words: Word[]): CapacityRow[] {
  const order = graphemeOrder(curriculum);
  const positions = new Map<number, string>();
  for (const unit of curriculum.units) {
    if (unit.graphemes.length === 0) continue;
    const end = (order.unitStart.get(unit.id) ?? 0) + unit.graphemes.length;
    positions.set(end, `end of unit ${unit.id} (${order.order[end - 1]})`);
  }
  for (const p of config.checkpoints) if (!positions.has(p)) positions.set(p, `checkpoint (${order.order[p - 1] ?? '-'})`);

  return [...positions.entries()]
    .sort(([a], [b]) => a - b)
    .map(([position, label]) => ({
      position,
      label,
      counts: Object.fromEntries(
        Object.entries(config.exercises).map(([id, rule]) => [id, capacityAt(rule, position, curriculum, words)]),
      ),
    }));
}

export function capacityErrors(config: CapacityConfig, rows: CapacityRow[]): string[] {
  const errors: string[] = [];
  for (const row of rows) {
    if (!config.checkpoints.includes(row.position)) continue;
    for (const [id, count] of Object.entries(row.counts)) {
      if (count === null) continue;
      const min = config.exercises[id]?.shows === 'graphemes' ? config.minChoices : config.minWords;
      if (count < min) errors.push(`capacity: ${id} has ${count} < ${min} at position ${row.position} (${row.label})`);
    }
  }
  return errors;
}

export function validateContent(content: Content, capacity: CapacityConfig): { errors: string[]; capacity: CapacityRow[] } {
  const rows = capacityTable(capacity, content.curriculum, content.words);
  return {
    errors: [
      ...validateCurriculum(content.curriculum),
      ...validateWords(content.words, content.curriculum),
      ...validateTexts(content.sentences, content.stories, content.curriculum),
      ...capacityErrors(capacity, rows),
    ],
    capacity: rows,
  };
}
