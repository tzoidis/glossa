// A letter comes back to Αστερούπολη (game review: the story of the lost letters
// never paid off). Shown once per new letter, after «Πάμε!»: the letter flies to the
// village, Αγκαθούλης jumps, and the next button goes on to the stations.

import { useEffect } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { t } from '../i18n.ts';
import { IconButton } from '../ui/IconButton.tsx';
import { NextIcon, VillageIcon } from '../ui/Icons.tsx';
import { Mascot } from '../ui/Mascot.tsx';

export function LetterReturn({ letters, after, onDone }: { letters: string[]; after?: Promise<unknown> | null; onDone(): void }) {
  const { audio } = useApp();

  useEffect(() => {
    const run = audio.sequence();
    void (async () => {
      await after;
      if (run.alive()) await audio.play({ kind: 'instruction', key: letters.length > 1 ? 'letters-returned' : 'letter-returned' });
    })();
    return () => audio.stop();
  }, [audio, after, letters.length]);

  return (
    <main className="screen screen--center letter-return">
      <div className="letter-return__scene">
        <div className="mascot-hop mascot-hop--loop">
          <Mascot mood="surprised" size={200} />
        </div>
        <div className="letter-return__letters" aria-label={t('letters.returned')}>
          {letters.map((g, i) => (
            <span key={g} className="returned-letter" style={{ animationDelay: `${0.3 + i * 0.5}s` }}>
              {g}
            </span>
          ))}
        </div>
        <div className="letter-return__village" aria-hidden>
          <VillageIcon />
        </div>
      </div>
      <IconButton label={t('nav.next')} variant="primary" onClick={onDone}>
        <NextIcon />
      </IconButton>
    </main>
  );
}
