// All exercise types. The mechanism drives station variety (PRD §5: never the same
// mechanism twice in a row); the icon is the station's picture (OpenMoji code).

import { alphabet } from './alphabet/index.ts';
import { article } from './article/index.ts';
import { blendSounds } from './blendSounds/index.ts';
import { buildSentence } from './buildSentence/index.ts';
import { buildWord } from './buildWord/index.ts';
import { digraph } from './digraph/index.ts';
import { findAll } from './findAll/index.ts';
import { firstLetter } from './firstLetter/index.ts';
import { joinSyllables } from './joinSyllables/index.ts';
import { lastSyllable } from './lastSyllable/index.ts';
import { missingLetter } from './missingLetter/index.ts';
import { readStory } from './readStory/index.ts';
import { NotEnoughContent } from './pool.ts';
import { stress } from './stress/index.ts';
import { syllableCount } from './syllableCount/index.ts';
import { trace } from './trace/index.ts';
import { trueFalse } from './trueFalse/index.ts';
import { upperLower } from './upperLower/index.ts';
import { whichSyllable } from './whichSyllable/index.ts';
import { whichWord } from './whichWord/index.ts';
import { wordPicture } from './wordPicture/index.ts';
import type { ExerciseModule, GenerateContext } from './types.ts';

export type Mechanism = 'tap-choice' | 'tap-many' | 'order' | 'listen-image' | 'memory' | 'trace';

export interface ExerciseEntry {
  module: ExerciseModule;
  mechanism: Mechanism;
  icon: string;
  /** practises the hand's movement: pointless with a mouse, so hidden without a touch screen */
  touchOnly?: boolean;
}

export const EXERCISES: ExerciseEntry[] = [
  { module: firstLetter, mechanism: 'tap-choice', icon: '1F442' },
  { module: joinSyllables, mechanism: 'order', icon: '1F9E9' },
  { module: syllableCount, mechanism: 'tap-choice', icon: '1F44F' },
  { module: wordPicture, mechanism: 'listen-image', icon: '1F4D6' },
  { module: buildWord, mechanism: 'order', icon: '1F9F1' },
  { module: whichSyllable, mechanism: 'tap-choice', icon: '1F4E3' },
  { module: blendSounds, mechanism: 'listen-image', icon: '1F50A' },
  { module: findAll, mechanism: 'tap-many', icon: '1F50D' },
  { module: missingLetter, mechanism: 'tap-choice', icon: '270F' },
  { module: whichWord, mechanism: 'tap-choice', icon: '1F5E3' },
  { module: trueFalse, mechanism: 'tap-choice', icon: '1F914' },
  { module: buildSentence, mechanism: 'order', icon: '1F4DD' },
  { module: readStory, mechanism: 'listen-image', icon: '1F4DA' },
  { module: article, mechanism: 'tap-choice', icon: '1F3F7' },
  { module: stress, mechanism: 'tap-choice', icon: '1F4CC' },
  { module: lastSyllable, mechanism: 'tap-choice', icon: '1F3C1' },
  { module: upperLower, mechanism: 'memory', icon: '1F3B4' },
  { module: trace, mechanism: 'trace', icon: '270D', touchOnly: true },
  { module: alphabet, mechanism: 'order', icon: '1F522' },
  { module: digraph, mechanism: 'tap-choice', icon: '1F91D' },
];

export interface Availability {
  position: number;
  enabledExercises: string[] | null;
  hasLocalVoice: boolean;
  hasTouch: boolean;
}

export function availableExercises(entries: ExerciseEntry[], a: Availability): ExerciseEntry[] {
  return entries.filter(({ module: m, touchOnly }) => {
    if (touchOnly && !a.hasTouch) return false;
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
