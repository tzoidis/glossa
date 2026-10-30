import type { ExerciseModule } from '../types.ts';
import { generateJoinSyllables, JOIN_SYLLABLES_ID } from './generate.ts';
import { JoinSyllables } from './JoinSyllables.tsx';

export const joinSyllables: ExerciseModule = {
  id: JOIN_SYLLABLES_ID,
  requires: { skills: [], minGraphemes: 3, needs: ['image', 'syllables'] },
  generate: generateJoinSyllables,
  Component: JoinSyllables,
};
