// Schema versions, oldest first. Never edit a released entry: append a new one.
// Before any upgrade, openDb() stores a snapshot of the old database (PRD §8).

import type { Transaction } from 'dexie';

export interface Migration {
  version: number;
  /** Dexie store definitions; only tables or indexes that change are needed */
  stores: Record<string, string | null>;
  upgrade?: (tx: Transaction) => void | PromiseLike<unknown>;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    stores: {
      children: 'id',
      settings: 'childId',
      answers: 'id, childId, [childId+ts], [childId+exerciseId]',
      reviewQueue: 'id, childId, [childId+dueRound]',
      recordings: 'key',
      world: 'id, childId',
      dailyTime: 'id, childId',
    },
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;
