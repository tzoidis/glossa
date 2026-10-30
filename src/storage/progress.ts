// What a session writes: answers, review queue, village items, stars.

import { dueKeys, reviewId, updateReview } from '../engine/reviewQueue.ts';
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

/** A star for finishing the round, whatever the accuracy (PRD §5). */
export async function completeRound(db: GlossaDb, childId: string): Promise<Child | undefined> {
  return db.transaction('rw', db.children, async () => {
    const child = await db.children.get(childId);
    if (!child) return undefined;
    const updated = { ...child, stars: child.stars + 1, roundsPlayed: (child.roundsPlayed ?? 0) + 1 };
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

export async function worldItems(db: GlossaDb, childId: string): Promise<WorldItem[]> {
  return db.world.where('childId').equals(childId).toArray();
}

export async function placeWorldItem(db: GlossaDb, id: string, x: number, y: number): Promise<void> {
  await db.world.update(id, { x, y });
}
