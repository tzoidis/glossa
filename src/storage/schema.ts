// Stored records (PRD §8 Dexie tables). AnswerLog is the PRD schema itself.

import type { ExerciseLevel } from '../engine/adaptive.ts';
import type { Flag, Word } from '../engine/types.ts';

export const DEFAULT_CHILD_ID = 'child-1';
export const DEFAULT_DAILY_LIMIT_MINUTES = 15;

export interface Child {
  id: string;
  name: string | null;
  createdAt: number;
  /** completion stars, spent in the village (PRD §5) */
  stars: number;
  /** rounds completed ever; the review queue's clock */
  roundsPlayed: number;
  /** difficulty per exercise id (PRD §5); missing = level 1 */
  levels?: Record<string, ExerciseLevel>;
}

export interface Settings {
  childId: string;
  /** "up to letter…": number of graphemes taught (see engine/allowedWords.ts) */
  upToPosition: number;
  /** null = every exercise whose requirements are met */
  enabledExercises: string[] | null;
  /** the exercises that existed when enabledExercises was saved: one added later starts on (missing = all known) */
  knownExercises?: string[];
  dailyLimitMinutes: number;
  leftHanded: boolean;
  extraFlags: Flag[];
  extraSkills: string[];
  /** 4-digit PIN; null = multiplication gate only */
  parentPin: string | null;
  /** exercise ids whose first-time demo has been shown */
  seenDemos: string[];
  lastBackupAt: number | null;
  /** answers from this time on count for the next-letter reminder; set when the letter changes or the reminder is put off (missing = all) */
  letterCheckFrom?: number;
}

export interface ReviewItem {
  /** `${childId}:${key}` */
  id: string;
  childId: string;
  /** e.g. "word:pie" or "grapheme:π" */
  key: string;
  /** round counter at which the item is due again */
  dueRound: number;
  /** rounds until the next review; grows on success, resets on a mistake */
  interval: number;
  lapses: number;
  lastSeen: number;
}

export interface Recording {
  /** audio key, e.g. "phoneme/σ", "instruction/first-letter", "syllable/πα" */
  key: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

/**
 * «Δικές μου λέξεις» (PRD §7): a word or name the parent added. It joins the bank
 * once its letters are taught (PRD §3), like any word.
 */
export interface CustomWord {
  /** a names.json id (its clip is bundled) or custom-<random> */
  id: string;
  childId: string;
  text: string;
  article: Word['article'];
  syllables: string[];
  kind: 'name' | 'word';
  /** an OpenMoji code; ignored when there is a photo */
  imageId?: string;
  /** JPEG data URL, at most 512px, re-encoded so no EXIF or location is kept */
  photo?: string;
  createdAt: number;
}

export interface WorldItem {
  id: string;
  childId: string;
  kind: 'word' | 'decoration' | 'outfit';
  /** word id or catalog id */
  ref: string;
  placedAt: number;
  x: number | null;
  y: number | null;
}

export interface DailyTime {
  /** `${childId}:${date}` */
  id: string;
  childId: string;
  /** local calendar date, YYYY-MM-DD */
  date: string;
  ms: number;
}

export function defaultSettings(childId: string, upToPosition: number): Settings {
  return {
    childId,
    upToPosition,
    enabledExercises: null,
    dailyLimitMinutes: DEFAULT_DAILY_LIMIT_MINUTES,
    leftHanded: false,
    extraFlags: [],
    extraSkills: [],
    parentPin: null,
    seenDemos: [],
    lastBackupAt: null,
  };
}

/** Local calendar date, so the daily limit resets at the child's midnight, not UTC's. */
export function localDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
