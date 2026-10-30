// All exercise types. The mechanism drives station variety (PRD §5: never the same
// mechanism twice in a row); the icon is the station's picture (OpenMoji code).

import { devStub } from './devStub/index.tsx';
import type { ExerciseModule } from './types.ts';

export type Mechanism = 'tap-choice' | 'order' | 'listen-image' | 'trace';

export interface ExerciseEntry {
  module: ExerciseModule;
  mechanism: Mechanism;
  icon: string;
}

export const EXERCISES: ExerciseEntry[] = [
  ...(import.meta.env.DEV ? [{ module: devStub, mechanism: 'tap-choice' as const, icon: '1F9EA' }] : []),
];

export interface Availability {
  position: number;
  enabledExercises: string[] | null;
  hasLocalVoice: boolean;
}

export function availableExercises(entries: ExerciseEntry[], a: Availability): ExerciseEntry[] {
  return entries.filter(({ module: m }) => {
    if (a.enabledExercises && !a.enabledExercises.includes(m.id)) return false;
    if (m.requires.minGraphemes > a.position) return false;
    if (m.requires.needs.includes('localTTS') && !a.hasLocalVoice) return false;
    return true;
  });
}

export function findExercise(id: string): ExerciseEntry | undefined {
  return EXERCISES.find((e) => e.module.id === id);
}
