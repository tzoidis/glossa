import type { ExerciseModule } from '../types.ts';
import { BuildSentence } from './BuildSentence.tsx';
import { BUILD_SENTENCE_ID, generateBuildSentence } from './generate.ts';

export const buildSentence: ExerciseModule = {
  id: BUILD_SENTENCE_ID,
  // PRD §4: from the end of unit 1, once enough sentences are readable
  requires: { skills: ['capital-start', 'full-stop'], minGraphemes: 9, needs: ['image', 'sentences'] },
  generate: generateBuildSentence,
  Component: BuildSentence,
};
