// Typed access to the bundled content files.

import curriculumJson from '../content/curriculum.json' with { type: 'json' };
import sentencesJson from '../content/sentences.json' with { type: 'json' };
import storiesJson from '../content/stories.json' with { type: 'json' };
import wordsJson from '../content/words.json' with { type: 'json' };
import { analyzeWord, graphemeOrder, type GraphemeOrder } from '../engine/allowedWords.ts';
import type { Curriculum, Sentence, Story, Word } from '../engine/types.ts';

export type AnalyzedWord = Word & { graphemes: string[]; minPosition: number };

export interface Content {
  curriculum: Curriculum;
  order: GraphemeOrder;
  words: AnalyzedWord[];
  wordsById: Map<string, AnalyzedWord>;
  sentences: Sentence[];
  stories: Story[];
}

const curriculum = curriculumJson as Curriculum;
const order = graphemeOrder(curriculum);
const words = (wordsJson as Word[]).map((w) => analyzeWord(w, order));

export const CONTENT: Content = {
  curriculum,
  order,
  words,
  wordsById: new Map(words.map((w) => [w.id, w])),
  sentences: sentencesJson as Sentence[],
  stories: storiesJson as Story[],
};

/** PRD §10: first run defaults to "all of Unit 1". */
export function defaultPosition(content: Content = CONTENT): number {
  const unit1 = content.curriculum.units.find((u) => u.id === 1);
  return unit1 ? (content.order.unitStart.get(1) ?? 0) + unit1.graphemes.length : 0;
}
