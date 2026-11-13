import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { backupDue, backupFileName, exportBackup, importBackup, InvalidBackup } from './backupFile.ts';
import { ensureChild, openDb, type GlossaDb } from './db.ts';
import { recordAnswer } from './progress.ts';
import { DEFAULT_CHILD_ID } from './schema.ts';

let n = 0;
const dbs: GlossaDb[] = [];
afterEach(() => dbs.splice(0).forEach((d) => d.close()));
async function freshDb() {
  const db = await openDb({ name: `bf-${++n}`, backupsName: `bf-backups-${n}` });
  dbs.push(db);
  return db;
}

async function seeded() {
  const db = await freshDb();
  await ensureChild(db, 9);
  await db.settings.update(DEFAULT_CHILD_ID, { upToPosition: 14, leftHanded: true, extraFlags: ['cluster'] });
  await recordAnswer(db, { id: 'a1', childId: DEFAULT_CHILD_ID, ts: 1, exerciseId: 'x', itemId: 'word:pie', target: 'π', given: 'τ', correct: false, attempt: 1, soundsRight: false, usedListen: false, latencyMs: 5, position: 0 }, 0);
  await db.recordings.put({ key: 'phoneme/σ', blob: new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'audio/mp4' }), mimeType: 'audio/mp4', createdAt: 7 });
  return db;
}

describe('backup file', () => {
  it('restores progress, settings and recordings completely, through JSON', async () => {
    const source = await seeded();
    const file = JSON.parse(JSON.stringify(await exportBackup(source, { includeRecordings: true, now: 99 })));
    const target = await freshDb();
    await importBackup(target, file);

    expect(await target.settings.get(DEFAULT_CHILD_ID)).toEqual(await source.settings.get(DEFAULT_CHILD_ID));
    expect(await target.answers.toArray()).toEqual(await source.answers.toArray());
    expect(await target.reviewQueue.toArray()).toEqual(await source.reviewQueue.toArray());
    const rec = (await target.recordings.get('phoneme/σ'))!;
    expect(rec.mimeType).toBe('audio/mp4');
    expect([...new Uint8Array(await rec.blob.arrayBuffer())]).toEqual([1, 2, 3, 250]);
  });

  it('can leave recordings out, and then keeps the ones already on the device', async () => {
    const source = await seeded();
    const file = await exportBackup(source, { includeRecordings: false });
    expect(file.tables.recordings).toBeUndefined();

    const target = await freshDb();
    await target.recordings.put({ key: 'phoneme/μ', blob: new Blob(['m']), mimeType: 'audio/webm', createdAt: 1 });
    await importBackup(target, JSON.parse(JSON.stringify(file)));
    expect(await target.recordings.count()).toBe(1);
    expect(await target.answers.count()).toBe(1);
  });

  it('rejects files that are not backups, or from a newer app', async () => {
    const db = await freshDb();
    await expect(importBackup(db, { hello: 1 })).rejects.toBeInstanceOf(InvalidBackup);
    await expect(importBackup(db, { app: 'glossa', schemaVersion: 999, tables: {} })).rejects.toBeInstanceOf(InvalidBackup);
    // a file with no child, or a settings row missing fields, would break the next start
    await expect(importBackup(db, { app: 'glossa', schemaVersion: 1, tables: {} })).rejects.toBeInstanceOf(InvalidBackup);
    await expect(
      importBackup(db, { app: 'glossa', schemaVersion: 1, tables: { children: [{ id: 'c', stars: 0 }], settings: [{ childId: 'c' }] } }),
    ).rejects.toBeInstanceOf(InvalidBackup);
  });

  it('names files by date and reminds monthly', () => {
    expect(backupFileName(new Date(2026, 9, 30).getTime())).toBe('glossa-backup-2026-10-30.json');
    const now = 100 * 24 * 3600 * 1000;
    expect(backupDue(null, false, now)).toBe(false);
    expect(backupDue(null, true, now)).toBe(true);
    expect(backupDue(now - 10 * 24 * 3600 * 1000, true, now)).toBe(false);
    expect(backupDue(now - 40 * 24 * 3600 * 1000, true, now)).toBe(true);
  });
});
