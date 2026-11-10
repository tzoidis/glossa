import type { ExerciseModule } from '../types.ts';
import { Dictation } from './Dictation.tsx';
import { DICTATION_ID, generateDictation } from './generate.ts';

export const dictation: ExerciseModule = {
  id: DICTATION_ID,
  // PRD §4: from unit 3 (18 graphemes come before it); the word is a bundled clip
  requires: { skills: [], minGraphemes: 19, needs: ['image'] },
  generate: generateDictation,
  Component: Dictation,
};
