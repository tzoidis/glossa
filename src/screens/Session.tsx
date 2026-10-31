// One session: 3 rounds, breaks, station choices, daily time limit (PRD §5).

import { useEffect, useReducer } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { sessionReducer, startSession } from '../engine/session.ts';
import { t } from '../i18n.ts';
import { addDailyTime } from '../storage/db.ts';
import { IconButton } from '../ui/IconButton.tsx';
import { HomeIcon, StarIcon, VillageIcon } from '../ui/Icons.tsx';
import { Mascot } from '../ui/Mascot.tsx';
import { BreakView } from './BreakView.tsx';
import { RoundPlayer } from './RoundPlayer.tsx';
import { StationChoice } from './StationChoice.tsx';
import { useStations } from './useStations.ts';

const TICK_MS = 15_000;

export function Session({ firstExerciseId, onHome, onVillage }: { firstExerciseId: string; onHome(): void; onVillage(): void }) {
  const { db, child, settings, audio } = useApp();
  const [state, dispatch] = useReducer(sessionReducer, firstExerciseId, startSession);
  const nextStations = useStations();
  const { phase } = state;

  // Count play time while the app is visible; stored, so a reload does not reset it.
  useEffect(() => {
    const limitMs = settings.dailyLimitMinutes * 60_000;
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void addDailyTime(db, child.id, TICK_MS).then((total) => {
        if (total >= limitMs) dispatch({ type: 'limitReached' });
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [db, child.id, settings.dailyLimitMinutes]);

  useEffect(() => {
    const key = phase.kind === 'choose' ? 'choose-station' : phase.kind === 'done' ? (phase.reason === 'limit' ? 'see-you-tomorrow' : 'round-complete') : null;
    if (!key) return;
    void audio.play({ kind: 'instruction', key });
    return () => audio.stop();
  }, [phase, audio]);

  switch (phase.kind) {
    case 'play':
      return (
        <main className="screen session">
          <RoundPlayer key={state.round} exerciseId={phase.exerciseId} onComplete={() => dispatch({ type: 'roundComplete' })} />
        </main>
      );

    case 'break':
      return (
        <main className="screen screen--center">
          <BreakView onContinue={() => dispatch({ type: 'continue', options: nextStations(state.played) })} />
        </main>
      );

    case 'choose':
      return (
        <main className="screen home-body">
          <Mascot mood="happy" size={160} />
          <StationChoice options={phase.options} onPick={(id) => dispatch({ type: 'choose', exerciseId: id })} />
        </main>
      );

    case 'done':
      return (
        <main className="screen screen--center done">
          <Mascot mood={phase.reason === 'limit' ? 'encouraging' : 'happy'} size={220} />
          {phase.reason === 'complete' && (
            <div className="stars-row">
              {state.played.map((_, i) => (
                <StarIcon key={i} size={72} />
              ))}
            </div>
          )}
          <div className="button-row">
            <IconButton label={t('nav.village')} onClick={onVillage}>
              <VillageIcon />
            </IconButton>
            <IconButton label={t('nav.home')} variant="primary" onClick={onHome}>
              <HomeIcon />
            </IconButton>
          </div>
        </main>
      );
  }
}
