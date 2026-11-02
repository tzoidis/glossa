import type { ExerciseModule } from '../types.ts';
import { generateWhichWord, WHICH_WORD_ID } from './generate.ts';
import { WhichWord } from './WhichWord.tsx';

export const whichWord: ExerciseModule = {
  id: WHICH_WORD_ID,
  // the heard word is a bundled clip; the choices are read
  requires: { skills: [], minGraphemes: 4, needs: [] },
  generate: generateWhichWord,
  Component: WhichWord,
};
