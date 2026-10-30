import type { ExerciseModule } from '../types.ts';
import { FirstLetter } from './FirstLetter.tsx';
import { FIRST_LETTER_ID, generateFirstLetter } from './generate.ts';

export const firstLetter: ExerciseModule = {
  id: FIRST_LETTER_ID,
  requires: { skills: [], minGraphemes: 2, needs: ['image', 'localTTS'] },
  generate: generateFirstLetter,
  Component: FirstLetter,
};
