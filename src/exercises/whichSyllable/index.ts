import type { ExerciseModule } from '../types.ts';
import { generateWhichSyllable, WHICH_SYLLABLE_ID } from './generate.ts';
import { WhichSyllable } from './WhichSyllable.tsx';

export const whichSyllable: ExerciseModule = {
  id: WHICH_SYLLABLE_ID,
  // syllable clips ship in the app, so no local voice is needed
  requires: { skills: [], minGraphemes: 2, needs: [] },
  generate: generateWhichSyllable,
  Component: WhichSyllable,
};
