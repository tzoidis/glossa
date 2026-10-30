// Shared exercise interface, PRD §8. Every exercise type is one folder under
// src/exercises/ exporting an ExerciseModule.

import type { FC } from 'react';
import type { AnswerLog, Flag, Level, Round, Sentence, Story, Word } from '../engine/types.ts';

export type ExerciseNeed = 'image' | 'syllables' | 'phonemeAudio' | 'localTTS' | 'sentences' | 'stories';

export interface GenerateContext {
  allowedGraphemes: Set<string>;
  unlockedFlags: Set<Flag>;
  wordPool: Word[];
  sentencePool: Sentence[];
  storyPool: Story[];
  level: Level;
  recentWordIds: string[];
  reviewQueue: string[];
  rng: () => number;
}

export interface ExerciseProps {
  round: Round;
  onAnswer(e: AnswerLog): void;
  onComplete(): void;
}

export interface ExerciseModule {
  id: string;
  requires: {
    skills: string[]; // e.g. "accent", "capital-start"
    minGraphemes: number; // how many letters the child must know
    needs: ExerciseNeed[];
  };
  /** No side effects; deterministic for the same rng seed. */
  generate(ctx: GenerateContext): Round;
  Component: FC<ExerciseProps>;
}
