// «Διαβάζω μια μικρή ιστορία»: a story of 2-5 sentences stays on screen while the
// child answers its questions (who / where / what) by tapping one of 3 pictures.
// Story and question are reading material: heard only if the child asks, and the
// question slowly after a mistake. ctx.storyPool holds only stories readable now.
// Level 1: one question per story when there are stories enough; then all of them.

import { shuffle } from '../../engine/rng.ts';
import type { Round, Story } from '../../engine/types.ts';
import { NotEnoughContent, ROUND_SIZE } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const READ_STORY_ID = 'read-story';
const MIN_STORIES = 3;

export interface StoryItem {
  storyId: string;
  lines: string[];
  question: number;
  prompt: string;
  /** picture codes, in screen order */
  options: string[];
  target: string;
}

/** clip keys (kind «sentence»): the whole story, and each question */
export const storyClipKey = (storyId: string) => `story-${storyId}`;
export const questionClipKey = (storyId: string, question: number) => `story-${storyId}-q${question + 1}`;

export function generateReadStory(ctx: GenerateContext): Round {
  const pool = ctx.storyPool.filter((s) => s.questions.length > 0);
  if (pool.length < MIN_STORIES) throw new NotEnoughContent(`only ${pool.length} stories`);

  const due = new Set(ctx.reviewQueue.filter((k) => k.startsWith('story:')).map((k) => k.split(':')[1]));
  const order = [...shuffle(pool.filter((s) => due.has(s.id)), ctx.rng), ...shuffle(pool.filter((s) => !due.has(s.id)), ctx.rng)];
  const perStory = ctx.level === 1 && order.length >= ROUND_SIZE ? 1 : Infinity;

  const items: StoryItem[] = [];
  for (const s of order) {
    s.questions.slice(0, perStory).forEach((q, i) => {
      if (items.length >= ROUND_SIZE) return;
      items.push(itemOf(s, i, q.imageChoices[q.answer]!, ctx));
    });
    if (items.length >= ROUND_SIZE) break;
  }

  return { id: `${READ_STORY_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: READ_STORY_ID, seed: 0, level: ctx.level, items };
}

function itemOf(s: Story, i: number, target: string, ctx: GenerateContext): StoryItem {
  const q = s.questions[i]!;
  return { storyId: s.id, lines: s.sentences, question: i, prompt: q.prompt, options: shuffle([...q.imageChoices], ctx.rng), target };
}
