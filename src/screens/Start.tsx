// «Πάμε!»: the tap that unlocks audio (browsers block sound before a gesture).
// No round is running here, so a waiting app update is applied on this screen.

import { useEffect } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { installUpdate, useUpdateReady } from '../app/appUpdate.ts';
import { t } from '../i18n.ts';
import { Mascot } from '../ui/Mascot.tsx';

/** onGo gets the welcome clip in progress, so the next screen can speak after it. */
export function Start({ onGo }: { onGo(welcome: Promise<unknown>): void }) {
  const { audio, recheckVoice } = useApp();
  const updateReady = useUpdateReady();

  useEffect(() => {
    if (updateReady) installUpdate();
  }, [updateReady]);

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
    </main>
  );
}
