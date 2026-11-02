// «Πάμε!»: the tap that unlocks audio (browsers block sound before a gesture).
// No round is running here, so a waiting app update is applied on this screen.
// The parent usually sees this screen first, so the way to the settings is here
// in words; before the first game a note asks them to set the letter first, and
// later one asks whether the class has moved on.

import { useEffect, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { installUpdate, useUpdateReady } from '../app/appUpdate.ts';
import { useNextLetterDue } from '../app/useNextLetterDue.ts';
import { t } from '../i18n.ts';
import { LockIcon } from '../ui/Icons.tsx';
import { Mascot } from '../ui/Mascot.tsx';

/** onGo gets the welcome clip in progress, so the next screen can speak after it. */
export function Start({ onGo, onParent }: { onGo(welcome: Promise<unknown>): void; onParent(): void }) {
  const { audio, recheckVoice, db } = useApp();
  const updateReady = useUpdateReady();
  const [firstTime, setFirstTime] = useState(false);
  const nextLetter = useNextLetterDue();
  const highlight = firstTime || nextLetter;

  useEffect(() => {
    if (updateReady) installUpdate();
  }, [updateReady]);

  useEffect(() => {
    void db.answers.count().then((n) => setFirstTime(n === 0));
  }, [db]);

  return (
    <main className="screen screen--center start">
      <Mascot mood="happy" size={220} />
      <button
        type="button"
        className="go"
        onClick={() => {
          audio.unlock();
          recheckVoice();
          // played inside the tap: browsers allow sound only from a user gesture
          onGo(audio.play({ kind: 'instruction', key: 'welcome' }));
        }}
      >
        {t('start.go')}
      </button>
      <div className="parent-entry">
        {firstTime && <p>{t('start.parentHint')}</p>}
        {!firstTime && nextLetter && <p>{t('start.nextLetterHint')}</p>}
        <button type="button" className={`parent-button${highlight ? ' primary' : ''}`} onClick={onParent}>
          <LockIcon />
          {t('start.parent')}
        </button>
      </div>
    </main>
  );
}
