import type { ExerciseModule } from '../types.ts';
import { generateLastSyllable, LAST_SYLLABLE_ID } from './generate.ts';
import { LastSyllable } from './LastSyllable.tsx';

export const lastSyllable: ExerciseModule = {
  id: LAST_SYLLABLE_ID,
  // PRD §4 («Με ποιον ήχο τελειώνει;»), unit 1: syllables, as the other sound games
  requires: { skills: [], minGraphemes: 3, needs: ['image', 'syllables'] },
  generate: generateLastSyllable,
  Component: LastSyllable,
};
