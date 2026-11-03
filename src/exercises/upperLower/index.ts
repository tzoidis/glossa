import type { ExerciseModule } from '../types.ts';
import { generateUpperLower, UPPER_LOWER_ID } from './generate.ts';
import { UpperLower } from './UpperLower.tsx';

export const upperLower: ExerciseModule = {
  id: UPPER_LOWER_ID,
  // PRD §4: from unit 1 (capitals and small letters are taught with each letter)
  requires: { skills: ['upper-lower'], minGraphemes: 3, needs: [] },
  generate: generateUpperLower,
  Component: UpperLower,
};
