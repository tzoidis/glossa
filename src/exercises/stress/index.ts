import type { ExerciseModule } from '../types.ts';
import { generateStress, STRESS_ID } from './generate.ts';
import { Stress } from './Stress.tsx';

export const stress: ExerciseModule = {
  id: STRESS_ID,
  // PRD §4: from unit 2; the word is a bundled clip
  requires: { skills: [], minGraphemes: 10, needs: ['syllables'] },
  generate: generateStress,
  Component: Stress,
};
