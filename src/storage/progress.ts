// What a session writes: answers, review queue, village items, stars.

import { nextLevel, readyForNextLetter } from '../engine/adaptive.ts';
import { dueKeys, MAX_INTERVAL, reviewId, updateReview } from '../engine/reviewQueue.ts';
import type { AnswerLog } from '../engine/types.ts';
import { wordIdOf } from '../exercises/answer.ts';
import type { GlossaDb } from './db.ts';
import type { Child, WorldItem } from './schema.ts';

/** Last 3 rounds' worth of answers: those words wait before coming back (PRD §5). */
export const RECENT_ANSWERS = 15;

export async function recordAnswer(db: GlossaDb, answer: AnswerLog, roundCounter: number): Promise<void> {
  await db.transaction('rw', db.answers, db.reviewQueue, db.world, async () => {
    await db.answers.add(answer);
    if (answer.attempt === 1) {
      // only first attempts move the review queue (PRD §4)
      const prev = await db.reviewQueue.get(reviewId(answer.childId, answer.itemId));
      await db.reviewQueue.put(updateReview(prev, answer.childId, answer.itemId, answer.correct, roundCounter, answer.ts));
    }

    // every word solved, even on the second try, joins the village
    const wordId = wordIdOf(answer.itemId);
    if (answer.correct && wordId) {
      const id = `${answer.childId}:word:${wordId}`;
      if (!(await db.world.get(id))) {
        await db.world.add({ id, childId: answer.childId, kind: 'word', ref: wordId, placedAt: answer.ts, x: null, y: null });
      }
    }
  });
}

/**
 * A star for finishing the round, whatever the accuracy (PRD §5). The
 * first-attempt share, when given, moves that exercise's difficulty level.
 */
export async function completeRound(
  db: GlossaDb,
  childId: string,
  result?: { exerciseId: string; share: number | null },
): Promise<Child | undefined> {
  return db.transaction('rw', db.children, async () => {
    const child = await db.children.get(childId);
    if (!child) return undefined;
    const updated: Child = { ...child, stars: child.stars + 1, roundsPlayed: (child.roundsPlayed ?? 0) + 1 };
    if (result && result.share !== null) {
      updated.levels = { ...child.levels, [result.exerciseId]: nextLevel(child.levels?.[result.exerciseId], result.share) };
    }
    await db.children.put(updated);
    return updated;
  });
}

export async function recentWordIds(db: GlossaDb, childId: string): Promise<string[]> {
  const recent = await db.answers
    .where('[childId+ts]')
    .between([childId, -Infinity], [childId, Infinity])
    .reverse()
    .limit(RECENT_ANSWERS)
    .toArray();
  return [...new Set(recent.map((a) => wordIdOf(a.itemId)).filter((id): id is string => id !== null))];
}

export async function dueReviewKeys(db: GlossaDb, childId: string, roundCounter: number): Promise<string[]> {
  return dueKeys(await db.reviewQueue.where('childId').equals(childId).toArray(), roundCounter);
}

/** «Εξάσκηση σε αυτό» (PRD §7): these items become due now, ahead of the rest of the queue. */
export async function practiceSoon(db: GlossaDb, childId: string, keys: string[], roundCounter: number, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.reviewQueue, async () => {
    for (const key of keys) {
      const prev = await db.reviewQueue.get(reviewId(childId, key));
      const base = prev ?? updateReview(undefined, childId, key, false, roundCounter, now);
      await db.reviewQueue.put({ ...base, interval: 1, dueRound: roundCounter - MAX_INTERVAL });
    }
  });
}

export async function worldItems(db: GlossaDb, childId: string): Promise<WorldItem[]> {
  return db.world.where('childId').equals(childId).toArray();
}

export async function placeWorldItem(db: GlossaDb, id: string, x: number, y: number): Promise<void> {
  await db.world.update(id, { x, y });
}

/** Should the parent be reminded to check whether the class moved to the next letter? */
export async function nextLetterDue(db: GlossaDb, childId: string, since: number, position: number, lastPosition: number): Promise<boolean> {
  const answers = await db.answers.where('[childId+ts]').between([childId, since], [childId, Infinity]).toArray();
  return readyForNextLetter(answers, position, lastPosition);
}
