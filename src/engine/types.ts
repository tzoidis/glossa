// Content schemas from PRD §3 and §8. The PRD is the source of truth;
// M2 adds Round, AnswerLog and ExerciseModule.

export type Flag = 'synizesis' | 'soft-g-ch' | 's-as-z' | 'double-consonant' | 'cluster';

export const ALL_FLAGS: readonly Flag[] = ['synizesis', 'soft-g-ch', 's-as-z', 'double-consonant', 'cluster'];

export interface Word {
  id: string;
  text: string; // with accent, NFC
  article: 'ο' | 'η' | 'το' | null;
  syllables: string[]; // school syllabification: ["πο","τή","ρια"]
  category: string;
  imageId?: string;
  audioKey?: string;
  flags: Flag[];
  tags: string[];
  // Computed (see analyzeWord), never written by hand:
  graphemes?: string[];
  minPosition?: number;
}

export interface Sentence {
  id: string;
  tokens: string[];
  imageId?: string;
  isTrueForImage?: boolean;
}

export interface Story {
  id: string;
  sentences: string[];
  questions: { prompt: string; imageChoices: string[]; answer: number }[];
}

export interface Unit {
  id: number;
  title: string;
  graphemes: string[];
  sightWords: string[];
  unlocksFlags: Flag[];
  skills: string[];
}

export interface Curriculum {
  book: string;
  units: Unit[];
}
