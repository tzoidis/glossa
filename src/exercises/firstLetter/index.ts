import type { ExerciseModule } from '../types.ts';
import { FirstLetter } from './FirstLetter.tsx';
import { FIRST_LETTER_ID, generateFirstLetter } from './generate.ts';

export const firstLetter: ExerciseModule = {
  id: FIRST_LETTER_ID,
  // every bank word ships as a clip (src/audio/files/word/), so no local voice is needed
  requires: { skills: [], minGraphemes: 2, needs: ['image'] },
  generate: generateFirstLetter,
  Component: FirstLetter,
};
