// Parent screen (PRD §7). Opens only through the gate. Before any setting or
// recording, an uninstalled app shows how to install it (iPad: Safari and the
// installed app do not share data).

import { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext.tsx';
import { installUpdate, isInstalled, useUpdateReady } from '../../app/appUpdate.ts';
import { t } from '../../i18n.ts';
import { backupDue } from '../../storage/backupFile.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { HomeIcon } from '../../ui/Icons.tsx';
import { AboutSection } from './AboutSection.tsx';
import { AudioSection } from './AudioSection.tsx';
import { BackupSection } from './BackupSection.tsx';
import { ExercisesSection } from './ExercisesSection.tsx';
import { GuideSection } from './GuideSection.tsx';
import { LettersSection } from './LettersSection.tsx';
import { MyWordsSection } from './MyWordsSection.tsx';
import { ParentGate } from './ParentGate.tsx';
import { ProgressSection } from './ProgressSection.tsx';
import { FlagsSection, OtherSection, TimeSection } from './SettingsSections.tsx';

function StorageStatus() {
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);
  if (persisted === null) return null;
  return (
    <p className={persisted ? 'help' : 'warn-text'}>
      {persisted ? t('parent.storage.persistent') : t('parent.storage.notPersistent')}{' '}
      {!persisted && (
        <button type="button" className="parent-button subtle" onClick={() => void navigator.storage.persist().then(setPersisted)}>
          {t('parent.storage.request')}
        </button>
      )}
    </p>
  );
}

function InstallNotice({ onContinue }: { onContinue(): void }) {
  return (
    <section className="parent-card install">
      <h2>{t('parent.install.title')}</h2>
      <p>{t('parent.install.body')}</p>
      <p>{t('parent.install.ios')}</p>
      <p>{t('parent.install.android')}</p>
      <button type="button" className="parent-button" onClick={onContinue}>
        {t('parent.install.continue')}
      </button>
    </section>
  );
}

export function Parent({ onClose }: { onClose(): void }) {
  const { db, child, settings } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [installAck, setInstallAck] = useState(isInstalled);
  const [hasProgress, setHasProgress] = useState(false);
  const updateReady = useUpdateReady();

  useEffect(() => {
    void db.answers.count().then((n) => setHasProgress(n > 0));
  }, [db, child.id]);

  if (!unlocked) return <ParentGate onPass={() => setUnlocked(true)} onCancel={onClose} />;

  return (
    <main className="parent-screen">
      <header className="parent-header">
        <h1>{t('parent.title')}</h1>
        <IconButton label={t('parent.close')} onClick={onClose}>
          <HomeIcon />
        </IconButton>
      </header>
      {!installAck ? (
        <InstallNotice onContinue={() => setInstallAck(true)} />
      ) : (
        <>
          {updateReady && (
            <p className="warn-text">
              {t('parent.update.ready')}{' '}
              <button type="button" className="parent-button primary" onClick={installUpdate}>
                {t('parent.update.install')}
              </button>
            </p>
          )}
          <StorageStatus />
          {backupDue(settings.lastBackupAt, hasProgress) && <p className="warn-text">{t('parent.backupDue')}</p>}
          <GuideSection open={!hasProgress} />
          <LettersSection />
          {hasProgress && <ProgressSection />}
          <ExercisesSection />
          <MyWordsSection />
          <TimeSection />
          <AudioSection />
          <FlagsSection />
          <OtherSection />
          <BackupSection />
          <AboutSection />
        </>
      )}
    </main>
  );
}
