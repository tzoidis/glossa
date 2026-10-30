import type { ExerciseModule } from '../types.ts';
import { generateWhichLetter, WHICH_LETTER_ID } from './generate.ts';
import { WhichLetter } from './WhichLetter.tsx';

export const whichLetter: ExerciseModule = {
  id: WHICH_LETTER_ID,
  requires: { skills: [], minGraphemes: 2, needs: ['phonemeAudio'] },
  generate: generateWhichLetter,
  Component: WhichLetter,
};
