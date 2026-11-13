import type { ExerciseModule } from '../types.ts';
import { EndMark } from './EndMark.tsx';
import { END_MARK_ID, generateEndMark } from './generate.ts';

export const endMark: ExerciseModule = {
  id: END_MARK_ID,
  // PRD §3: unit 5 teaches «τελεία και ερωτηματικό», unit 7 the exclamation mark
  requires: { skills: ['question-mark'], minGraphemes: 0, needs: ['sentences'] },
  generate: generateEndMark,
  Component: EndMark,
};
