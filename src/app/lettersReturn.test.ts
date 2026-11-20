import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureChild, openDb, type GlossaDb } from '../storage/db.ts';
import { DEFAULT_CHILD_ID } from '../storage/schema.ts';
import { CONTENT } from './content.ts';
import { markLettersReturned, MAX_RETURNING, returningLetters } from './lettersReturn.ts';

const order = CONTENT.order.order;

describe('returningLetters', () => {
  it('welcomes back the letters taught since last time, in book order', () => {
    expect(returningLetters(order, 12, { lettersReturned: 11, roundsPlayed: 5 })).toEqual([order[11]]);
    expect(returningLetters(order, 12, { lettersReturned: 10, roundsPlayed: 5 })).toEqual(order.slice(10, 12));
  });

  it('shows only the latest few after a big jump', () => {
    expect(returningLetters(order, 20, { lettersReturned: 2, roundsPlayed: 5 })).toHaveLength(MAX_RETURNING);
    expect(returningLetters(order, 20, { lettersReturned: 2, roundsPlayed: 5 }).at(-1)).toBe(order[19]);
  });

  it('shows nothing before the first round, when nothing is new, or in the thematic units', () => {
    expect(returningLetters(order, 12, { lettersReturned: 3, roundsPlayed: 0 })).toEqual([]);
    expect(returningLetters(order, 12, { lettersReturned: undefined, roundsPlayed: 5 })).toEqual([]);
    expect(returningLetters(order, 12, { lettersReturned: 12, roundsPlayed: 5 })).toEqual([]);
    expect(returningLetters(order, 8, { lettersReturned: 12, roundsPlayed: 5 })).toEqual([]);
    expect(returningLetters(order, order.length + 2, { lettersReturned: order.length, roundsPlayed: 5 })).toEqual([]);
  });
});

describe('markLettersReturned', () => {
  const dbs: GlossaDb[] = [];
  afterEach(() => dbs.splice(0).forEach((d) => d.close()));

  it('only ever moves forward, so a letter returns once', async () => {
    const db = await openDb({ name: 'letters-1', backupsName: 'letters-backups-1' });
    dbs.push(db);
    await ensureChild(db, 9);
    await markLettersReturned(db, DEFAULT_CHILD_ID, 9);
    await markLettersReturned(db, DEFAULT_CHILD_ID, 5);
    expect((await db.children.get(DEFAULT_CHILD_ID))?.lettersReturned).toBe(9);
    await markLettersReturned(db, DEFAULT_CHILD_ID, 11);
    expect((await db.children.get(DEFAULT_CHILD_ID))?.lettersReturned).toBe(11);
  });
});
