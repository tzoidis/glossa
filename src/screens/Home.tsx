// Home: the first station choice is right here, so a session starts in 2 taps
// from the start screen («Πάμε!», then a station). PRD §9.

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { t } from '../i18n.ts';
import { getDailyTime } from '../storage/db.ts';
import { IconButton } from '../ui/IconButton.tsx';
import { LockIcon, VillageIcon } from '../ui/Icons.tsx';
import { Mascot } from '../ui/Mascot.tsx';
import { StationChoice } from './StationChoice.tsx';
import { useStations } from './useStations.ts';
import { DevDebug } from '../ui/DevDebug.tsx';

export function Home({
  after,
  onPlay,
  onVillage,
  onParent,
}: {
  /** a clip still playing (the welcome): speak after it, not over it */
  after?: Promise<unknown> | null;
  onPlay(exerciseId: string): void;
  onVillage(): void;
  onParent(): void;
}) {
  const { db, child, settings, audio } = useApp();
  const nextStations = useStations();
  // Re-pick when availability changes (the voice check can finish after Home opens).
  const options = useMemo(() => nextStations(), [nextStations]);
  const [limitReached, setLimitReached] = useState<boolean | null>(null);

  useEffect(() => {
    void getDailyTime(db, child.id).then((ms) => setLimitReached(ms >= settings.dailyLimitMinutes * 60_000));
  }, [db, child.id, settings.dailyLimitMinutes]);

  useEffect(() => {
    if (limitReached === null) return;
    const run = audio.sequence();
    void (async () => {
      await after;
      if (run.alive()) await audio.play({ kind: 'instruction', key: limitReached ? 'see-you-tomorrow' : 'choose-station' });
    })();
    return () => audio.stop();
  }, [limitReached, audio, after]);

  if (limitReached === null) return <main className="screen" />;

  return (
    <main className="screen home">
      <div className="top-bar">
        <button type="button" className="parent-lock" aria-label={t('nav.parent')} onClick={onParent}>
          <LockIcon />
        </button>
        <IconButton label={t('nav.village')} onClick={onVillage}>
          <VillageIcon />
        </IconButton>
      </div>
      {limitReached ? (
        <div className="screen--center grow">
          <Mascot mood="encouraging" size={240} />
        </div>
      ) : (
        <div className="home-body">
          <Mascot mood={options.length ? 'happy' : 'thinking'} size={180} />
          <StationChoice options={options} onPick={onPlay} />
        </div>
      )}
      {import.meta.env.DEV && location.search.includes('debug') && <DevDebug />}
    </main>
  );
}
