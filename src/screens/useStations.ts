import { useCallback, useMemo } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { hasTouchScreen } from '../app/device.ts';
import { buildGenerateContext } from '../app/generateContext.ts';
import { pickStations } from '../engine/session.ts';
import { availableExercises, canGenerate, EXERCISES, findExercise, STAGE_WEIGHTS, type Stage } from '../exercises/registry.ts';

/** transition before any letter; units 1-2; from unit 3 on, reading proper */
export function stageAt(position: number, unit3Start: number): Stage {
  return position === 0 ? 'transition' : position <= unit3Start ? 'early' : 'reading';
}

/** Picks the next stations (STATIONS_PER_CHOICE) from the exercises available right now. */
export function useStations() {
  const { settings, voice, content, allow } = useApp();
  // (skills come from the units reached: «question-mark» in unit 5 and so on)
  const available = useMemo(
    () =>
      availableExercises(EXERCISES, {
        position: settings.upToPosition,
        enabledExercises: settings.enabledExercises,
        knownExercises: settings.knownExercises,
        skills: allow.skills,
        hasLocalVoice: voice !== null,
        hasTouch: hasTouchScreen(),
      })
        .filter((e) => canGenerate(e.module, buildGenerateContext({ content, allow, level: 1, recentWordIds: [], reviewQueue: [], seed: 1 })))
        .map((e) => ({ id: e.module.id, mechanism: e.mechanism, weight: STAGE_WEIGHTS[stageAt(settings.upToPosition, content.order.unitStart.get(3) ?? 0)][e.family] })),
    [settings, voice, content, allow],
  );

  return useCallback(
    (played: string[] = []) => {
      const last = played.length ? (findExercise(played[played.length - 1]!)?.mechanism ?? null) : null;
      return pickStations(available, last, played, Math.random);
    },
    [available],
  );
}
