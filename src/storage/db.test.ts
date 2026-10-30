import 'fake-indexeddb/auto';
import { Dexie } from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { exportTables, importTables, listMigrationBackups } from './backup.ts';
import { addDailyTime, ensureChild, getDailyTime, GlossaDb, openDb } from './db.ts';
import { MIGRATIONS, SCHEMA_VERSION, type Migration } from './migrations.ts';
import { DEFAULT_CHILD_ID } from './schema.ts';

let n = 0;
const names = () => ({ name: `test-${++n}`, backupsName: `test-backups-${n}` });
const open: Dexie[] = [];
afterEach(() => {
  open.splice(0).forEach((db) => db.close());
});

describe('migrations', () => {
  it('are numbered 1, 2, 3… in order', () => {
    expect(MIGRATIONS.map((m) => m.version)).toEqual(MIGRATIONS.map((_, i) => i + 1));
    expect(SCHEMA_VERSION).toBe(MIGRATIONS.length);
  });
});

describe('openDb', () => {
  it('creates every PRD table on first run without a backup', async () => {
    const opts = names();
    const db = await openDb(opts);
    open.push(db);
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['answers', 'children', 'dailyTime', 'recordings', 'reviewQueue', 'settings', 'world'].sort(),
    );
    expect(db.verno).toBe(SCHEMA_VERSION);
    expect(await listMigrationBackups(opts.backupsName)).toEqual([]);
  });

  it('snapshots the old database before upgrading', async () => {
    const opts = names();
    const v1 = await openDb({ ...opts, migrations: MIGRATIONS.slice(0, 1) });
    await ensureChild(v1, 9, 1000);
    v1.close();

    const v2: Migration = {
      version: 2,
      stores: { world: 'id, childId, kind' },
      upgrade: (tx) => tx.table('children').toCollection().modify((c: { stars: number }) => (c.stars = 5)),
    };
    const db = await openDb({ ...opts, migrations: [MIGRATIONS[0]!, v2], now: () => 2000 });
    open.push(db);

    expect((await db.children.get(DEFAULT_CHILD_ID))?.stars).toBe(5);
    const [backup, ...rest] = await listMigrationBackups(opts.backupsName);
    expect(rest).toEqual([]);
    expect(backup).toMatchObject({ dbName: opts.name, fromVersion: 1, toVersion: 2, createdAt: 2000 });
    expect(backup!.data.children).toEqual([{ id: DEFAULT_CHILD_ID, name: null, createdAt: 1000, stars: 0 }]);
    expect(backup!.data.settings).toHaveLength(1);
  });

  it('does not back up when the version is current', async () => {
    const opts = names();
    (await openDb(opts)).close();
    const db = await openDb(opts);
    open.push(db);
    expect(await listMigrationBackups(opts.backupsName)).toEqual([]);
  });
});

describe('ensureChild', () => {
  it('creates the default child once and keeps parent changes', async () => {
    const db = await openDb(names());
    open.push(db);
    const first = await ensureChild(db, 9);
    expect(first).toMatchObject({ childId: DEFAULT_CHILD_ID, upToPosition: 9, dailyLimitMinutes: 15, leftHanded: false });

    await db.settings.update(DEFAULT_CHILD_ID, { upToPosition: 12 });
    expect((await ensureChild(db, 9)).upToPosition).toBe(12);
    expect(await db.children.count()).toBe(1);
  });
});

describe('daily time', () => {
  it('accumulates per local day and survives reopening', async () => {
    const opts = names();
    const day1 = new Date(2026, 9, 30, 17, 0).getTime();
    const day2 = new Date(2026, 9, 31, 9, 0).getTime();

    const db = await openDb(opts);
    await addDailyTime(db, 'c', 60_000, day1);
    await addDailyTime(db, 'c', 30_000, day1 + 3_600_000);
    db.close();

    const again = await openDb(opts);
    open.push(again);
    expect(await getDailyTime(again, 'c', day1)).toBe(90_000);
    expect(await getDailyTime(again, 'c', day2)).toBe(0);
    expect(await addDailyTime(again, 'c', 1_000, day2)).toBe(1_000);
  });
});

describe('snapshots', () => {
  it('round-trip every table, including recording blobs', async () => {
    const a = await openDb(names());
    const b = await openDb(names());
    open.push(a, b);
    await ensureChild(a, 9);
    await a.recordings.put({ key: 'phoneme/σ', blob: new Blob(['abc'], { type: 'audio/mp4' }), mimeType: 'audio/mp4', createdAt: 1 });
    await b.world.put({ id: 'stale', childId: 'x', kind: 'word', ref: 'pie', placedAt: 0, x: null, y: null });

    await importTables(b, await exportTables(a));

    expect(await b.world.count()).toBe(0);
    expect(await b.settings.get(DEFAULT_CHILD_ID)).toEqual(await a.settings.get(DEFAULT_CHILD_ID));
    const rec = await b.recordings.get('phoneme/σ');
    expect(rec?.mimeType).toBe('audio/mp4');
    expect(rec?.blob).toBeDefined();
  });
});

it('GlossaDb exposes typed tables', () => {
  const db = new GlossaDb('typed', MIGRATIONS);
  expect(db.answers.name).toBe('answers');
});
