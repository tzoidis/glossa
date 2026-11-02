import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnswerLog } from '../engine/types.ts';
import { ensureChild, openDb, type GlossaDb } from './db.ts';
import { completeRound, dueReviewKeys, nextLetterDue, placeWorldItem, recentWordIds, recordAnswer, worldItems } from './progress.ts';
import { DEFAULT_CHILD_ID } from './schema.ts';

let n = 0;
const dbs: GlossaDb[] = [];
afterEach(() => dbs.splice(0).forEach((d) => d.close()));

async function freshDb() {
  const db = await openDb({ name: `progress-${++n}`, backupsName: `progress-backups-${n}` });
  dbs.push(db);
  await ensureChild(db, 9);
  return db;
}

let ts = 0;
const answer = (itemId: string, correct: boolean, attempt: 1 | 2 = 1): AnswerLog => ({
  id: `a${++ts}`,
  childId: DEFAULT_CHILD_ID,
  ts,
  exerciseId: 'x',
  itemId,
  target: itemId,
  given: itemId,
  correct,
  attempt,
  soundsRight: false,
  usedListen: false,
  latencyMs: 0,
  position: 0,
});

describe('recordAnswer', () => {
  it('stores the answer, queues mistakes and adds every solved word to the village once', async () => {
    const db = await freshDb();
    await recordAnswer(db, answer('word:pie', false), 0);
    await recordAnswer(db, answer('word:pie', true, 2), 0); // second attempt: no review change, still a village item
    await recordAnswer(db, answer('word:ball', true), 0);
    await recordAnswer(db, answer('word:ball', true), 1);
    await recordAnswer(db, answer('grapheme:π', true), 1);

    expect(await db.answers.count()).toBe(5);
    expect(await dueReviewKeys(db, DEFAULT_CHILD_ID, 1)).toEqual(['word:pie']);
    const world = await worldItems(db, DEFAULT_CHILD_ID);
    expect(world.map((w) => w.ref)).toEqual(['ball', 'pie']);

    await placeWorldItem(db, world[0]!.id, 40, 60);
    expect((await worldItems(db, DEFAULT_CHILD_ID))[0]).toMatchObject({ x: 40, y: 60 });
  });
});

describe('recentWordIds', () => {
  it('returns words from the latest answers, newest first', async () => {
    const db = await freshDb();
    for (let i = 0; i < 20; i++) await recordAnswer(db, answer(`word:w${i}`, true), 0);
    await recordAnswer(db, answer('grapheme:α', true), 0);
    const recent = await recentWordIds(db, DEFAULT_CHILD_ID);
    expect(recent[0]).toBe('w19');
    expect(recent).toHaveLength(14);
    expect(recent).not.toContain('w5');
  });
});

describe('completeRound', () => {
  it('gives one star per round and advances the review clock', async () => {
    const db = await freshDb();
    await completeRound(db, DEFAULT_CHILD_ID);
    const child = await completeRound(db, DEFAULT_CHILD_ID);
    expect(child).toMatchObject({ stars: 2, roundsPlayed: 2 });
  });

  it('moves the level of the exercise played, and keeps it across reads', async () => {
    const db = await freshDb();
    await completeRound(db, DEFAULT_CHILD_ID, { exerciseId: 'first-letter', share: 1 });
    await completeRound(db, DEFAULT_CHILD_ID, { exerciseId: 'first-letter', share: 1 });
    await completeRound(db, DEFAULT_CHILD_ID, { exerciseId: 'word-picture', share: null });
    const child = await db.children.get(DEFAULT_CHILD_ID);
    expect(child?.levels).toEqual({ 'first-letter': { level: 2, goodRounds: 0 } });
    expect(child?.stars).toBe(3);
  });
});

describe('nextLetterDue', () => {
  it('counts only answers since the letter changed', async () => {
    const db = await freshDb();
    const start = ts;
    for (let i = 0; i < 30; i++) await recordAnswer(db, answer(`word:w${i}`, true), 0);
    expect(await nextLetterDue(db, DEFAULT_CHILD_ID, 0, 5, 20)).toBe(true);
    expect(await nextLetterDue(db, DEFAULT_CHILD_ID, start + 2, 5, 20)).toBe(false);
  });
});
