import type { ExerciseModule } from '../types.ts';
import { generateSpelling, SPELLING_ID } from './generate.ts';
import { Spelling } from './Spelling.tsx';

export const spelling: ExerciseModule = {
  id: SPELLING_ID,
  // PRD §4: only rules the book has taught; the noun endings come in unit 5
  requires: { skills: ['noun-endings'], minGraphemes: 0, needs: ['image'] },
  generate: generateSpelling,
  Component: Spelling,
};
