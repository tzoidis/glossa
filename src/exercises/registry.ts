// All exercise types. The mechanism drives station variety (PRD §5: never the same
// mechanism twice in a row); the icon is the station's picture (OpenMoji code).

import { alphabet } from './alphabet/index.ts';
import { article } from './article/index.ts';
import { blendSounds } from './blendSounds/index.ts';
import { buildSentence } from './buildSentence/index.ts';
import { buildWord } from './buildWord/index.ts';
import { dictation } from './dictation/index.ts';
import { digraph } from './digraph/index.ts';
import { endMark } from './endMark/index.ts';
import { findAll } from './findAll/index.ts';
import { firstLetter } from './firstLetter/index.ts';
import { joinSyllables } from './joinSyllables/index.ts';
import { lastSyllable } from './lastSyllable/index.ts';
import { missingLetter } from './missingLetter/index.ts';
import { readStory } from './readStory/index.ts';
import { NotEnoughContent } from './pool.ts';
import { spelling } from './spelling/index.ts';
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

export type Family = 'sounds' | 'letters' | 'words' | 'sentences' | 'writing';

export interface ExerciseEntry {
  module: ExerciseModule;
  mechanism: Mechanism;
  icon: string;
  /** what it practises; gives the station its colour, the same every time (UI review) */
  family: Family;
  /** practises the hand's movement: pointless with a mouse, so hidden without a touch screen */
  touchOnly?: boolean;
}

export const EXERCISES: ExerciseEntry[] = [
  { module: firstLetter, mechanism: 'tap-choice', icon: '1F442', family: 'letters' },
  { module: joinSyllables, mechanism: 'order', icon: '1F9E9', family: 'words' },
  { module: syllableCount, mechanism: 'tap-choice', icon: '1F44F', family: 'sounds' },
  { module: wordPicture, mechanism: 'listen-image', icon: '1F4D6', family: 'words' },
  { module: buildWord, mechanism: 'order', icon: '1F9F1', family: 'words' },
  { module: whichSyllable, mechanism: 'tap-choice', icon: '1F4E3', family: 'sounds' },
  { module: blendSounds, mechanism: 'listen-image', icon: '1F9F2', family: 'sounds' },
  { module: findAll, mechanism: 'tap-many', icon: '1F50D', family: 'sounds' },
  { module: missingLetter, mechanism: 'tap-choice', icon: '1F573', family: 'letters' },
  { module: whichWord, mechanism: 'tap-choice', icon: '1F440', family: 'words' },
  { module: trueFalse, mechanism: 'tap-choice', icon: '1F914', family: 'sentences' },
  { module: buildSentence, mechanism: 'order', icon: '1F682', family: 'sentences' },
  { module: readStory, mechanism: 'listen-image', icon: '1F4DA', family: 'sentences' },
  { module: article, mechanism: 'tap-choice', icon: '1F3F7', family: 'words' },
  { module: stress, mechanism: 'tap-choice', icon: '1F4AA', family: 'words' },
  { module: lastSyllable, mechanism: 'tap-choice', icon: '1F3C1', family: 'sounds' },
  { module: upperLower, mechanism: 'memory', icon: '1F3B4', family: 'letters' },
  { module: trace, mechanism: 'trace', icon: '270D', family: 'writing', touchOnly: true },
  { module: alphabet, mechanism: 'order', icon: '1F522', family: 'letters' },
  { module: digraph, mechanism: 'tap-choice', icon: '1F91D', family: 'letters' },
  { module: dictation, mechanism: 'order', icon: '1F4DD', family: 'writing' },
  { module: endMark, mechanism: 'tap-choice', icon: '2753', family: 'sentences' },
  { module: spelling, mechanism: 'tap-choice', icon: '1F58A', family: 'writing' },
];

export interface Availability {
  position: number;
  enabledExercises: string[] | null;
  knownExercises?: string[];
  /** skills of the units reached (allow.skills); an exercise needing others waits */
  skills?: ReadonlySet<string>;
  hasLocalVoice: boolean;
  hasTouch: boolean;
}

/**
 * Turned on by the parent. A game added after the parent last changed the list was
 * never turned off, so it is on.
 */
export function isEnabled(id: string, s: { enabledExercises: string[] | null; knownExercises?: string[] }): boolean {
  if (!s.enabledExercises || s.enabledExercises.includes(id)) return true;
  return s.knownExercises !== undefined && !s.knownExercises.includes(id);
}

export function availableExercises(entries: ExerciseEntry[], a: Availability): ExerciseEntry[] {
  return entries.filter(({ module: m, touchOnly }) => {
    if (touchOnly && !a.hasTouch) return false;
    if (!isEnabled(m.id, a)) return false;
    if (a.skills && !m.requires.skills.every((s) => a.skills!.has(s))) return false;
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
