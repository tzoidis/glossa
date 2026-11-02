import type { ExerciseModule } from '../types.ts';
import { generateTrueFalse, TRUE_FALSE_ID } from './generate.ts';
import { TrueFalse } from './TrueFalse.tsx';

export const trueFalse: ExerciseModule = {
  id: TRUE_FALSE_ID,
  // PRD §4: from unit 2; the sentence is read, its clip only on request
  requires: { skills: ['capital-start', 'full-stop'], minGraphemes: 10, needs: ['image', 'sentences'] },
  generate: generateTrueFalse,
  Component: TrueFalse,
};
