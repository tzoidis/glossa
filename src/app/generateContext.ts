import type { AllowContext } from '../engine/allowedWords.ts';
import { mulberry32 } from '../engine/rng.ts';
import type { Level } from '../engine/types.ts';
import type { GenerateContext } from '../exercises/types.ts';
import type { Content } from './content.ts';

export interface GenerateInputs {
  content: Content;
  allow: AllowContext;
  level: Level;
  recentWordIds: string[];
  reviewQueue: string[];
  seed: number;
}

export function buildGenerateContext({ content, allow, level, recentWordIds, reviewQueue, seed }: GenerateInputs): GenerateContext {
  return {
    allowedGraphemes: new Set(content.order.order.slice(0, allow.position)),
    unlockedFlags: allow.unlockedFlags,
    wordPool: content.words,
    sentencePool: content.sentences,
    storyPool: content.stories,
    level,
    recentWordIds,
    reviewQueue,
    rng: mulberry32(seed),
  };
}
