// All exercise types. The mechanism drives station variety (PRD §5: never the same
// mechanism twice in a row); the icon is the station's picture (OpenMoji code).

import { blendSounds } from './blendSounds/index.ts';
import { buildWord } from './buildWord/index.ts';
import { firstLetter } from './firstLetter/index.ts';
import { joinSyllables } from './joinSyllables/index.ts';
import { NotEnoughContent } from './pool.ts';
import { syllableCount } from './syllableCount/index.ts';
import { whichSyllable } from './whichSyllable/index.ts';
import { wordPicture } from './wordPicture/index.ts';
import type { ExerciseModule, GenerateContext } from './types.ts';

export type Mechanism = 'tap-choice' | 'order' | 'listen-image' | 'trace';

export interface ExerciseEntry {
  module: ExerciseModule;
  mechanism: Mechanism;
  icon: string;
}

export const EXERCISES: ExerciseEntry[] = [
  { module: firstLetter, mechanism: 'tap-choice', icon: '1F442' },
  { module: joinSyllables, mechanism: 'order', icon: '1F9E9' },
  { module: syllableCount, mechanism: 'tap-choice', icon: '1F44F' },
  { module: wordPicture, mechanism: 'listen-image', icon: '1F4D6' },
  { module: buildWord, mechanism: 'order', icon: '1F9F1' },
  { module: whichSyllable, mechanism: 'tap-choice', icon: '1F4E3' },
  { module: blendSounds, mechanism: 'listen-image', icon: '1F50A' },
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

/** An exercise is offered only if it can fill a round right now (PRD §5: hide rather than show a locked word). */
export function canGenerate(m: ExerciseModule, ctx: GenerateContext): boolean {
  try {
    m.generate(ctx);
    return true;
  } catch (e) {
    if (e instanceof NotEnoughContent) return false;
    throw e;
  }
}

export function findExercise(id: string): ExerciseEntry | undefined {
  return EXERCISES.find((e) => e.module.id === id);
}
