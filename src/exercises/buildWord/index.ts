import type { ExerciseModule } from '../types.ts';
import { BuildWord } from './BuildWord.tsx';
import { BUILD_WORD_ID, generateBuildWord } from './generate.ts';

export const buildWord: ExerciseModule = {
  id: BUILD_WORD_ID,
  requires: { skills: [], minGraphemes: 4, needs: ['image'] },
  generate: generateBuildWord,
  Component: BuildWord,
};
