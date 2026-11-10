import type { ExerciseModule } from '../types.ts';
import { Digraph } from './Digraph.tsx';
import { DIGRAPH_ID, generateDigraph } from './generate.ts';

export const digraph: ExerciseModule = {
  id: DIGRAPH_ID,
  // PRD §4: unit 4, once «μπ» is taught and clusters are unlocked (the labels need both)
  requires: { skills: [], minGraphemes: 29, needs: [] },
  generate: generateDigraph,
  Component: Digraph,
};
