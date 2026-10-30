// «Πάμε!»: the tap that unlocks audio (browsers block sound before a gesture).
// No round is running here, so a waiting app update is applied on this screen.

import { useEffect } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { installUpdate, useUpdateReady } from '../app/appUpdate.ts';
import { t } from '../i18n.ts';
import { Mascot } from '../ui/Mascot.tsx';

export function Start({ onGo }: { onGo(): void }) {
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
          void audio.play({ kind: 'instruction', key: 'welcome' });
          onGo();
        }}
      >
        {t('start.go')}
      </button>
    </main>
  );
}
