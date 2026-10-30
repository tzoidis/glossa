// The parent's backup file (PRD §7): all data as JSON, optionally without
// recordings. Recording blobs travel as base64 so one file restores everything.

import type { Dexie } from 'dexie';
import { exportTables, importTables, type Snapshot } from './backup.ts';

export const BACKUP_APP = 'glossa';
const RECORDINGS = 'recordings';

export interface BackupFile {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: number;
  includesRecordings: boolean;
  tables: Snapshot;
}

interface EncodedBlob {
  __blob: string;
  type: string;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

const isEncodedBlob = (v: unknown): v is EncodedBlob => typeof v === 'object' && v !== null && typeof (v as EncodedBlob).__blob === 'string';

export async function exportBackup(db: Dexie, { includeRecordings, now = Date.now() }: { includeRecordings: boolean; now?: number }): Promise<BackupFile> {
  const tables = await exportTables(db);
  if (!includeRecordings) delete tables[RECORDINGS];
  else {
    tables[RECORDINGS] = await Promise.all(
      (tables[RECORDINGS] ?? []).map(async (row) => {
        const r = row as { blob: Blob };
        return { ...r, blob: { __blob: await blobToBase64(r.blob), type: r.blob.type } satisfies EncodedBlob };
      }),
    );
  }
  return { app: BACKUP_APP, schemaVersion: db.verno, exportedAt: now, includesRecordings: includeRecordings, tables };
}

export class InvalidBackup extends Error {}

/** Validates and restores a backup. Tables missing from the file (e.g. recordings) are left as they are. */
export async function importBackup(db: Dexie, file: unknown): Promise<void> {
  const f = file as Partial<BackupFile> | null;
  if (!f || f.app !== BACKUP_APP || typeof f.schemaVersion !== 'number' || typeof f.tables !== 'object' || f.tables === null) {
    throw new InvalidBackup('not a backup of this app');
  }
  if (f.schemaVersion > db.verno) throw new InvalidBackup('backup from a newer version of the app');
  const known = new Set(db.tables.map((t) => t.name));
  const tables: Snapshot = {};
  for (const [name, rows] of Object.entries(f.tables)) {
    if (!known.has(name)) continue;
    if (!Array.isArray(rows)) throw new InvalidBackup(`table ${name} is not a list`);
    tables[name] =
      name === RECORDINGS
        ? (rows as { blob: unknown }[]).map((r) => ({ ...r, blob: isEncodedBlob(r.blob) ? base64ToBlob(r.blob.__blob, r.blob.type) : r.blob }))
        : rows;
  }
  await importTables(db, tables);
}

export function backupFileName(now = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `glossa-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

const MONTH_MS = 30 * 24 * 3600 * 1000;

/** PRD §7: suggest a backup if there is something to lose and the last one is over a month old. */
export function backupDue(lastBackupAt: number | null, hasProgress: boolean, now = Date.now()): boolean {
  return hasProgress && (lastBackupAt === null || now - lastBackupAt > MONTH_MS);
}
