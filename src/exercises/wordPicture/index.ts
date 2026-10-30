import type { ExerciseModule } from '../types.ts';
import { generateWordPicture, WORD_PICTURE_ID } from './generate.ts';
import { WordPicture } from './WordPicture.tsx';

export const wordPicture: ExerciseModule = {
  id: WORD_PICTURE_ID,
  requires: { skills: [], minGraphemes: 4, needs: ['image'] },
  generate: generateWordPicture,
  Component: WordPicture,
};
