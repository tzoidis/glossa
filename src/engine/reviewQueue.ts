// Review queue, PRD §5: items with mistakes come back soon; items answered
// correctly come back less and less often. Time is counted in rounds played,
// not days, so a week off does not flood the next session.
// Keys are AnswerLog.itemId values, e.g. "word:pie" or "grapheme:π".

import type { ReviewItem } from '../storage/schema.ts';

export const FIRST_INTERVAL = 4;
export const MAX_INTERVAL = 32;

export function reviewId(childId: string, key: string): string {
  return `${childId}:${key}`;
}

/** Only first attempts count (PRD §4). */
export function updateReview(prev: ReviewItem | undefined, childId: string, key: string, correct: boolean, roundCounter: number, now: number): ReviewItem {
  const interval = correct ? (prev ? Math.min(prev.interval * 2, MAX_INTERVAL) : FIRST_INTERVAL) : 1;
  return {
    id: reviewId(childId, key),
    childId,
    key,
    interval,
    dueRound: roundCounter + interval,
    lapses: (prev?.lapses ?? 0) + (correct ? 0 : 1),
    lastSeen: now,
  };
}

/** Keys due by this round: most overdue first, then most often missed. */
export function dueKeys(items: ReviewItem[], roundCounter: number, limit = 5): string[] {
  return items
    .filter((i) => i.dueRound <= roundCounter)
    .sort((a, b) => a.dueRound - b.dueRound || b.lapses - a.lapses)
    .slice(0, limit)
    .map((i) => i.key);
}
