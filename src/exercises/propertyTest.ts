// Seeded property tests over every position × level (PRD §8). Failures print the seed.

import { CONTENT } from '../app/content.ts';
import { buildGenerateContext } from '../app/generateContext.ts';
import { makeContext } from '../engine/allowedWords.ts';
import type { Level, Round } from '../engine/types.ts';
import { NotEnoughContent } from './pool.ts';
import type { ExerciseModule, GenerateContext } from './types.ts';

export const SEEDS_PER_CASE = 12;
export const LEVELS: Level[] = [1, 2, 3];

export interface Case {
  position: number;
  level: Level;
  seed: number;
  ctx: GenerateContext;
  label: string;
}

export function* cases(recentWordIds: string[] = []): Generator<Case> {
  for (let position = 0; position <= CONTENT.order.maxPosition; position++) {
    const allow = makeContext(CONTENT.curriculum, { position }, CONTENT.words);
    for (const level of LEVELS) {
      for (let s = 0; s < SEEDS_PER_CASE; s++) {
        const seed = position * 1000 + level * 100 + s;
        const ctx = buildGenerateContext({ content: CONTENT, allow, level, recentWordIds, reviewQueue: [], seed });
        yield { position, level, seed, ctx, label: `position=${position} level=${level} seed=${seed}` };
      }
    }
  }
}

/** Runs generate; NotEnoughContent is a valid outcome (the exercise is hidden). */
export function tryGenerate(m: ExerciseModule, c: Case): Round | null {
  try {
    return m.generate(c.ctx);
  } catch (e) {
    if (e instanceof NotEnoughContent) return null;
    throw new Error(`${m.id} ${c.label}: ${(e as Error).message}`);
  }
}
