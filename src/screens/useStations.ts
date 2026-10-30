import { useCallback, useMemo } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { pickStations } from '../engine/session.ts';
import { availableExercises, EXERCISES, findExercise } from '../exercises/registry.ts';

/** Picks the next two stations from the exercises available right now. */
export function useStations() {
  const { settings, voice } = useApp();
  const available = useMemo(
    () =>
      availableExercises(EXERCISES, {
        position: settings.upToPosition,
        enabledExercises: settings.enabledExercises,
        hasLocalVoice: voice !== null,
      }).map((e) => ({ id: e.module.id, mechanism: e.mechanism })),
    [settings, voice],
  );

  return useCallback(
    (played: string[] = []) => {
      const last = played.length ? (findExercise(played[played.length - 1]!)?.mechanism ?? null) : null;
      return pickStations(available, last, played, Math.random);
    },
    [available],
  );
}
