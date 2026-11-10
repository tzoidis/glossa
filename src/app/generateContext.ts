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

type Readable = Pick<GenerateContext, 'allowedGraphemes' | 'sentencePool' | 'storyPool'>;

// The same for every round at one position: worked out once per allow context
// (the app keeps one per position; the property tests sweep thousands of rounds).
const readableCache = new WeakMap<AllowContext, WeakMap<Content, Readable>>();

function readableNow(content: Content, allow: AllowContext): Readable {
  let byContent = readableCache.get(allow);
  if (!byContent) readableCache.set(allow, (byContent = new WeakMap()));
  let r = byContent.get(content);
  if (!r) {
    r = {
      allowedGraphemes: new Set(content.order.order.slice(0, allow.position)),
      // the context carries no sight words, so texts are filtered here: only what can be read now
      sentencePool: content.sentences.filter((x) => isTextAllowed(x.tokens.join(' '), allow)),
      storyPool: content.stories.filter((x) => [...x.sentences, ...x.questions.map((q) => q.prompt)].every((line) => isTextAllowed(line, allow))),
    };
    byContent.set(content, r);
  }
  return r;
}

export function buildGenerateContext({ content, allow, level, recentWordIds, reviewQueue, seed }: GenerateInputs): GenerateContext {
  return {
    ...readableNow(content, allow),
    unlockedFlags: allow.unlockedFlags,
    wordPool: content.words,
    level,
    recentWordIds,
    reviewQueue,
    rng: mulberry32(seed),
  };
}
