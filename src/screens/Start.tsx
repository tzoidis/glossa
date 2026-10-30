// «Πάμε!»: the tap that unlocks audio (browsers block sound before a gesture).

import { useApp } from '../app/AppContext.tsx';
import { t } from '../i18n.ts';
import { Mascot } from '../ui/Mascot.tsx';

export function Start({ onGo }: { onGo(): void }) {
  const { audio, recheckVoice } = useApp();
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
