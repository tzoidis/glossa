import { useRef, useState } from 'react';
import { useApp } from '../../app/AppContext.tsx';
import { isInstalled } from '../../app/appUpdate.ts';
import { t, type UiKey } from '../../i18n.ts';
import { backupFileName, exportBackup, importBackup, InvalidBackup } from '../../storage/backupFile.ts';
import { useUpdateSettings } from './useSettings.ts';

export function BackupSection() {
  const { db, settings, refresh } = useApp();
  const update = useUpdateSettings();
  const [withoutMedia, setWithoutMedia] = useState(false);
  const [message, setMessage] = useState<UiKey | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const doExport = async () => {
    const now = Date.now();
    let file;
    try {
      file = await exportBackup(db, { includeRecordings: !withoutMedia, now });
    } catch {
      // nothing was saved: the monthly reminder must stay on
      setMessage('parent.backup.failed');
      return;
    }
    // the file records its own date, so a restore does not ask for a backup again
    for (const row of (file.tables.settings ?? []) as { lastBackupAt?: number | null }[]) row.lastBackupAt = now;
    const name = backupFileName(now);
    const blob = new File([JSON.stringify(file)], name, { type: 'application/json' });
    // An installed app on iPad/iPhone often saves nothing from a download link, so there
    // the share sheet saves it («Αποθήκευση στα Αρχεία»), and only a completed share counts.
    let shared = false;
    if (isInstalled() && navigator.canShare?.({ files: [blob] })) {
      try {
        await navigator.share({ files: [blob] });
        shared = true;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return; // cancelled: nothing was saved
        // e.g. NotAllowedError when reading a big database outlasted the tap: download instead
      }
    }
    if (!shared) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
    // marked only once the file exists
    await update({ lastBackupAt: now });
    setMessage('parent.backup.saved');
  };

  const doImport = async (f: File) => {
    if (!window.confirm(t('parent.backup.confirm'))) return;
    try {
      await importBackup(db, JSON.parse(await f.text()));
      await refresh();
      setMessage('parent.backup.imported');
    } catch (e) {
      console.error('import', e);
      setMessage(e instanceof InvalidBackup || e instanceof SyntaxError ? 'parent.backup.invalid' : 'parent.backup.importFailed');
    }
  };

  return (
    <section className="parent-card">
      <h2>{t('parent.section.backup')}</h2>
      <p className="help">{t('parent.backup.help')}</p>
      <p>{settings.lastBackupAt ? t('parent.backup.last', { date: new Date(settings.lastBackupAt).toLocaleDateString('el-GR') }) : t('parent.backup.never')}</p>
      <label className="toggle-row">
        <input type="checkbox" checked={withoutMedia} onChange={(e) => setWithoutMedia(e.target.checked)} />
        <span className="grow-text">{t('parent.backup.withoutMedia')}</span>
      </label>
      <div className="field-row">
        <button type="button" className="parent-button primary" onClick={() => void doExport()}>
          {t('parent.backup.export')}
        </button>
        <button type="button" className="parent-button" onClick={() => fileInput.current?.click()}>
          {t('parent.backup.import')}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void doImport(f);
          }}
        />
      </div>
      {message && <p className={message === 'parent.backup.imported' || message === 'parent.backup.saved' ? 'help' : 'warn-text'}>{t(message)}</p>}
    </section>
  );
}
