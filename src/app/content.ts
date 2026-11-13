// Typed access to the bundled content files.

import curriculumJson from '../content/curriculum.json' with { type: 'json' };
import namesJson from '../content/names.json' with { type: 'json' };
import sentencesJson from '../content/sentences.json' with { type: 'json' };
import storiesJson from '../content/stories.json' with { type: 'json' };
import wordsJson from '../content/words.json' with { type: 'json' };
import { analyzeWord, graphemeOrder, type GraphemeOrder } from '../engine/allowedWords.ts';
import { detectFlags } from '../engine/pronunciationFlags.ts';
import type { Curriculum, Sentence, Story, Word } from '../engine/types.ts';
import type { CustomWord } from '../storage/schema.ts';

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

/** Names a parent can pick (names.json), each with a bundled clip in Eleni's voice. */
export const NAMES = namesJson as Word[];
const NAMES_BY_ID = new Map(NAMES.map((n) => [n.id, n]));

/** The tag of every name: games that split a word into small letters leave names out. */
export const NAME_TAG = 'name';
/** The tag of every word the parent added. */
export const CUSTOM_TAG = 'custom';

/** The picture id of a parent's photo: Picture shows the registered photo for it. */
export const photoImageId = (wordId: string) => `photo:${wordId}`;

/** A word the parent added, as a bank word: a picked name keeps its id, syllables and flags. */
export function customToWord(c: CustomWord): Word {
  const listed = NAMES_BY_ID.get(c.id);
  const tags = c.kind === 'name' ? [NAME_TAG, CUSTOM_TAG] : [CUSTOM_TAG];
  const imageId = c.photo ? photoImageId(c.id) : c.imageId;
  return {
    id: c.id,
    text: c.text,
    article: c.article,
    syllables: listed?.syllables ?? c.syllables,
    category: listed?.category ?? CUSTOM_TAG,
    ...(imageId ? { imageId } : {}),
    flags: listed?.flags ?? detectFlags(c.text, c.syllables),
    tags,
  };
}

/** The bundled content plus the parent's own words; without any, the bundled content itself. */
export function withCustomWords(content: Content, custom: CustomWord[]): Content {
  if (custom.length === 0) return content;
  const extra = custom.map((c) => analyzeWord(customToWord(c), content.order));
  const words = [...content.words, ...extra];
  return { ...content, words, wordsById: new Map(words.map((w) => [w.id, w])) };
}

/** PRD §10: first run defaults to "all of Unit 1". */
export function defaultPosition(content: Content = CONTENT): number {
  const unit1 = content.curriculum.units.find((u) => u.id === 1);
  return unit1 ? (content.order.unitStart.get(1) ?? 0) + unit1.graphemes.length : 0;
}
