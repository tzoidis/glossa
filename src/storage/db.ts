// IndexedDB through Dexie (PRD §8). All data stays on the device.

import { Dexie, type EntityTable } from 'dexie';
import type { AnswerLog } from '../engine/types.ts';
import { BACKUPS_DB_NAME, exportTables, saveMigrationBackup } from './backup.ts';
import { MIGRATIONS, type Migration } from './migrations.ts';
import {
  DEFAULT_CHILD_ID,
  defaultSettings,
  localDate,
  type Child,
  type CustomWord,
  type DailyTime,
  type Recording,
  type ReviewItem,
  type Settings,
  type WorldItem,
} from './schema.ts';

export const DB_NAME = 'glossa';

export class GlossaDb extends Dexie {
  declare children: EntityTable<Child, 'id'>;
  declare settings: EntityTable<Settings, 'childId'>;
  declare answers: EntityTable<AnswerLog, 'id'>;
  declare reviewQueue: EntityTable<ReviewItem, 'id'>;
  declare recordings: EntityTable<Recording, 'key'>;
  declare world: EntityTable<WorldItem, 'id'>;
  declare dailyTime: EntityTable<DailyTime, 'id'>;
  declare customWords: EntityTable<CustomWord, 'id'>;

  constructor(name: string, migrations: Migration[]) {
    super(name);
    for (const m of migrations) {
      const v = this.version(m.version).stores(m.stores);
      if (m.upgrade) v.upgrade(m.upgrade);
    }
  }
}

export interface OpenOptions {
  name?: string;
  migrations?: Migration[];
  backupsName?: string;
  now?: () => number;
}

/** Opens the database, first snapshotting it if an upgrade is about to run. */
export async function openDb(options: OpenOptions = {}): Promise<GlossaDb> {
  const { name = DB_NAME, migrations = MIGRATIONS, backupsName = BACKUPS_DB_NAME, now = Date.now } = options;
  const target = migrations[migrations.length - 1]!.version;

  if (await Dexie.exists(name)) {
    const probe = new Dexie(name); // dynamic mode: opens the existing schema as is
    try {
      await probe.open();
      if (probe.verno < target) {
        await saveMigrationBackup(
          { dbName: name, fromVersion: probe.verno, toVersion: target, createdAt: now(), data: await exportTables(probe) },
          backupsName,
        );
      }
    } finally {
      probe.close();
    }
  }

  const db = new GlossaDb(name, migrations);
  await db.open();
  return db;
}

/** Creates the default child and settings on first run. */
export async function ensureChild(db: GlossaDb, defaultPosition: number, now = Date.now()): Promise<Settings> {
  return db.transaction('rw', db.children, db.settings, async () => {
    if (!(await db.children.get(DEFAULT_CHILD_ID))) {
      await db.children.add({ id: DEFAULT_CHILD_ID, name: null, createdAt: now, stars: 0, roundsPlayed: 0 });
    }
    const existing = await db.settings.get(DEFAULT_CHILD_ID);
    if (existing) return existing;
    const settings = defaultSettings(DEFAULT_CHILD_ID, defaultPosition);
    await db.settings.add(settings);
    return settings;
  });
}

/** Adds play time to today's total; stored so a page reload does not reset the limit. */
export async function addDailyTime(db: GlossaDb, childId: string, ms: number, now = Date.now()): Promise<number> {
  const date = localDate(now);
  const id = `${childId}:${date}`;
  return db.transaction('rw', db.dailyTime, async () => {
    const total = ((await db.dailyTime.get(id))?.ms ?? 0) + ms;
    await db.dailyTime.put({ id, childId, date, ms: total });
    return total;
  });
}

export async function getDailyTime(db: GlossaDb, childId: string, now = Date.now()): Promise<number> {
  return (await db.dailyTime.get(`${childId}:${localDate(now)}`))?.ms ?? 0;
}
