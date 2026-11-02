import type { ExerciseModule } from '../types.ts';
import { generateSyllableCount, SYLLABLE_COUNT_ID } from './generate.ts';
import { SyllableCount } from './SyllableCount.tsx';

export const syllableCount: ExerciseModule = {
  id: SYLLABLE_COUNT_ID,
  // every bank word ships as a clip (src/audio/files/word/), so no local voice is needed
  requires: { skills: [], minGraphemes: 0, needs: ['image', 'syllables'] },
  generate: generateSyllableCount,
  Component: SyllableCount,
};
