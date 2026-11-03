import type { ExerciseModule } from '../types.ts';
import { generateTrace, TRACE_ID } from './generate.ts';
import { Trace } from './Trace.tsx';

export const trace: ExerciseModule = {
  id: TRACE_ID,
  // PRD §4: from unit 1; each letter as soon as it is taught
  requires: { skills: [], minGraphemes: 1, needs: [] },
  generate: generateTrace,
  Component: Trace,
};
