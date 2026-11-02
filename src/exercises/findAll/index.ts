import type { ExerciseModule } from '../types.ts';
import { FindAll } from './FindAll.tsx';
import { FIND_ALL_ID, generateFindAll } from './generate.ts';

export const findAll: ExerciseModule = {
  id: FIND_ALL_ID,
  // the syllable and the words of the pictures are bundled clips: no local voice needed
  requires: { skills: [], minGraphemes: 0, needs: ['image', 'syllables'] },
  generate: generateFindAll,
  Component: FindAll,
};
