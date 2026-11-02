import type { ExerciseModule } from '../types.ts';
import { FindAll } from './FindAll.tsx';
import { FIND_ALL_ID, generateFindAll } from './generate.ts';

export const findAll: ExerciseModule = {
  id: FIND_ALL_ID,
  // the syllable is a bundled clip; the words of the pictures need the local voice
  requires: { skills: [], minGraphemes: 0, needs: ['image', 'syllables', 'localTTS'] },
  generate: generateFindAll,
  Component: FindAll,
};
