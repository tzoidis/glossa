import type { ExerciseModule } from '../types.ts';
import { generateReadStory, READ_STORY_ID } from './generate.ts';
import { ReadStory } from './ReadStory.tsx';

export const readStory: ExerciseModule = {
  id: READ_STORY_ID,
  // PRD §4: from unit 2, once enough stories are readable
  requires: { skills: ['capital-start', 'full-stop'], minGraphemes: 10, needs: ['stories'] },
  generate: generateReadStory,
  Component: ReadStory,
};
