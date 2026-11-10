import type { ExerciseModule } from '../types.ts';
import { Alphabet } from './Alphabet.tsx';
import { ALPHABET_ID, generateAlphabet } from './generate.ts';

export const alphabet: ExerciseModule = {
  id: ALPHABET_ID,
  // PRD §4: from unit 4 (27 graphemes are taught before it)
  requires: { skills: [], minGraphemes: 28, needs: [] },
  generate: generateAlphabet,
  Component: Alphabet,
};
