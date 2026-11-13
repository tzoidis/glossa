// Difficulty per exercise type (PRD §5): up a level after a perfect round, or after
// 2 rounds in a row with ≥ 80% right on the first attempt; down after a round below
// 50%. A right answer after listening to the reading material counts half: it was
// heard, not read. No timer.

import type { Level } from './types.ts';

export interface ExerciseLevel {
  level: Level;
  /** good rounds in a row at this level */
  goodRounds: number;
}

export const START_LEVEL: ExerciseLevel = { level: 1, goodRounds: 0 };
export const UP_SHARE = 0.8;
export const DOWN_SHARE = 0.5;
export const ROUNDS_TO_GO_UP = 2;
/** the next-letter reminder asks for more than a level-up does */
export const NEXT_LETTER_SHARE = 0.85;

/** Share of first attempts that were right; null when the round logged none. */
export function firstAttemptShare(answers: readonly { attempt: 1 | 2; correct: boolean; usedListen?: boolean }[]): number | null {
  const first = answers.filter((a) => a.attempt === 1);
  if (first.length === 0) return null;
  const credit = first.reduce((sum, a) => sum + (a.correct ? (a.usedListen ? 0.5 : 1) : 0), 0);
  return credit / first.length;
}

export function nextLevel(prev: ExerciseLevel | undefined, share: number): ExerciseLevel {
  const { level, goodRounds } = prev ?? START_LEVEL;
  if (share < DOWN_SHARE) return { level: Math.max(1, level - 1) as Level, goodRounds: 0 };
  if (share < UP_SHARE) return { level, goodRounds: 0 };
  if (level === 3) return { level, goodRounds: 0 };
  // a perfect round is enough: with 20 games each comes round about once a week
  if (share >= 1) return { level: (level + 1) as Level, goodRounds: 0 };
  return goodRounds + 1 >= ROUNDS_TO_GO_UP ? { level: (level + 1) as Level, goodRounds: 0 } : { level, goodRounds: goodRounds + 1 };
}

/** First attempts since the letter last changed before the parent is reminded. */
export const NEXT_LETTER_ANSWERS = 30;

/**
 * Has the child mastered the letters set so far? Only a reminder to the parent,
 * who alone moves the letter (PRD §2): the app cannot know what the class taught.
 * `answers` are those logged since the letter last changed (or the reminder was put off).
 */
export function readyForNextLetter(answers: readonly { attempt: 1 | 2; correct: boolean }[], position: number, lastPosition: number): boolean {
  if (position >= lastPosition) return false;
  const first = answers.filter((a) => a.attempt === 1);
  if (first.length < NEXT_LETTER_ANSWERS) return false;
  return (firstAttemptShare(first.slice(-NEXT_LETTER_ANSWERS)) ?? 0) >= NEXT_LETTER_SHARE;
}
