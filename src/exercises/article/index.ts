import type { ExerciseModule } from '../types.ts';
import { Article } from './Article.tsx';
import { ARTICLE_ID, generateArticle } from './generate.ts';

export const article: ExerciseModule = {
  id: ARTICLE_ID,
  // PRD §4: from unit 2; ο, η, το are all taught in unit 1
  requires: { skills: [], minGraphemes: 10, needs: ['image'] },
  generate: generateArticle,
  Component: Article,
};
