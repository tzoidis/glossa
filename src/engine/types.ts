// Schemas from PRD §3 and §8. The PRD is the source of truth.
// ExerciseModule lives in src/exercises/types.ts (it needs React).

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

export type Level = 1 | 2 | 3;

export interface Round {
  id: string;
  exerciseId: string;
  seed: number;
  level: Level;
  items: unknown[];
}

export interface AnswerLog {
  id: string;
  childId: string;
  ts: number;
  exerciseId: string;
  itemId: string;
  target: string;
  given: string;
  correct: boolean;
  /** only attempt 1 counts for statistics and adaptive (PRD §4) */
  attempt: 1 | 2;
  /** wrong spelling that sounds right (πώδι for πόδι) */
  soundsRight: boolean;
  /** child pressed "listen" on reading material */
  usedListen: boolean;
  latencyMs: number;
  /** question index within the round */
  position: number;
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
