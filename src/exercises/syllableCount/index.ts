import type { ExerciseModule } from '../types.ts';
import { generateSyllableCount, SYLLABLE_COUNT_ID } from './generate.ts';
import { SyllableCount } from './SyllableCount.tsx';

export const syllableCount: ExerciseModule = {
  id: SYLLABLE_COUNT_ID,
  requires: { skills: [], minGraphemes: 0, needs: ['image', 'syllables', 'localTTS'] },
  generate: generateSyllableCount,
  Component: SyllableCount,
};
