// Raw table snapshots: used for the automatic pre-migration backup.
// The parent's JSON export/import (M6) builds on these.

import { Dexie, type EntityTable } from 'dexie';

export type Snapshot = Record<string, unknown[]>;

export interface MigrationBackup {
  id: string;
  dbName: string;
  fromVersion: number;
  toVersion: number;
  createdAt: number;
  data: Snapshot;
}

export const BACKUPS_DB_NAME = 'glossa-backups';
const KEEP_BACKUPS = 3;

class BackupsDb extends Dexie {
  declare backups: EntityTable<MigrationBackup, 'id'>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ backups: 'id, createdAt' });
  }
}

export async function exportTables(db: Dexie): Promise<Snapshot> {
  const snapshot: Snapshot = {};
  for (const table of db.tables) snapshot[table.name] = await table.toArray();
  return snapshot;
}

/** Replaces the contents of every table present in the snapshot. */
export async function importTables(db: Dexie, snapshot: Snapshot): Promise<void> {
  const tables = db.tables.filter((t) => t.name in snapshot);
  await db.transaction('rw', tables, async () => {
    for (const table of tables) {
      await table.clear();
      await table.bulkPut(snapshot[table.name]!);
    }
  });
}

export async function saveMigrationBackup(backup: Omit<MigrationBackup, 'id'>, backupsName = BACKUPS_DB_NAME): Promise<void> {
  const db = new BackupsDb(backupsName);
  try {
    await db.backups.put({ ...backup, id: `${backup.dbName}:${backup.fromVersion}->${backup.toVersion}:${backup.createdAt}` });
    const old = await db.backups.orderBy('createdAt').reverse().offset(KEEP_BACKUPS).primaryKeys();
    await db.backups.bulkDelete(old);
  } finally {
    db.close();
  }
}

export async function listMigrationBackups(backupsName = BACKUPS_DB_NAME): Promise<MigrationBackup[]> {
  const db = new BackupsDb(backupsName);
  try {
    return await db.backups.orderBy('createdAt').reverse().toArray();
  } finally {
    db.close();
  }
}
