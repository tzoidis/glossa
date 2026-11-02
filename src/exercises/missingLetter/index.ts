import type { ExerciseModule } from '../types.ts';
import { generateMissingLetter, MISSING_LETTER_ID } from './generate.ts';
import { MissingLetter } from './MissingLetter.tsx';

export const missingLetter: ExerciseModule = {
  id: MISSING_LETTER_ID,
  requires: { skills: [], minGraphemes: 4, needs: ['image'] },
  generate: generateMissingLetter,
  Component: MissingLetter,
};
