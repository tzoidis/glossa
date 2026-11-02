import { isTextAllowed, type AllowContext } from '../engine/allowedWords.ts';
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
    // the context carries no sight words, so texts are filtered here: only what can be read now
    sentencePool: content.sentences.filter((x) => isTextAllowed(x.tokens.join(' '), allow)),
    storyPool: content.stories.filter((x) => x.sentences.every((line) => isTextAllowed(line, allow))),
    level,
    recentWordIds,
    reviewQueue,
    rng: mulberry32(seed),
  };
}
