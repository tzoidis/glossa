import { isTextAllowed, type AllowContext } from '../engine/allowedWords.ts';
import { mulberry32 } from '../engine/rng.ts';
import type { Level } from '../engine/types.ts';
import type { GenerateContext } from '../exercises/types.ts';
import { NAME_TAG, type Content } from './content.ts';

export interface GenerateInputs {
  content: Content;
  allow: AllowContext;
  level: Level;
  recentWordIds: string[];
  reviewQueue: string[];
  seed: number;
  /** the game takes names (registry `names`): the others split words into small letters */
  names?: boolean;
}

type Readable = Pick<GenerateContext, 'allowedGraphemes' | 'sentencePool' | 'storyPool'>;

/** a sentence ending in «;» or «!» waits for the unit that teaches it (5 and 7) */
const MARK_SKILL: Record<string, string> = { ';': 'question-mark', '!': 'exclamation-mark' };
const marksTaught = (tokens: string[], allow: AllowContext) => tokens.every((t) => !MARK_SKILL[t] || allow.skills.has(MARK_SKILL[t]!));

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
      sentencePool: content.sentences.filter((x) => isTextAllowed(x.tokens.join(' '), allow) && marksTaught(x.tokens, allow)),
      storyPool: content.stories.filter((x) => [...x.sentences, ...x.questions.map((q) => q.prompt)].every((line) => isTextAllowed(line, allow))),
    };
    byContent.set(content, r);
  }
  return r;
}

const withoutNames = new WeakMap<Content, Content['words']>();

function wordsWithoutNames(content: Content): Content['words'] {
  let words = withoutNames.get(content);
  if (!words) withoutNames.set(content, (words = content.words.filter((w) => !w.tags.includes(NAME_TAG))));
  return words;
}

export function buildGenerateContext({ content, allow, level, recentWordIds, reviewQueue, seed, names = false }: GenerateInputs): GenerateContext {
  return {
    ...readableNow(content, allow),
    unlockedFlags: allow.unlockedFlags,
    wordPool: names ? content.words : wordsWithoutNames(content),
    level,
    recentWordIds,
    reviewQueue,
    rng: mulberry32(seed),
  };
}
