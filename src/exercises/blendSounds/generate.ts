// «Ενώνω ήχους»: hear /π/-/ί/-/τ/-/α/ (recorded letter sounds), pick the picture
// from 3. No letters on screen. Only words whose sounds can be blended one letter
// at a time: no γ/χ before ε/ι, σ as ζ, double letters, synizesis, or αυ/ευ
// (each of those sounds different from its separate letters).
// Levels: up to 4 sounds, then 5, then 6 with pictures that start with the same sound.

import greek from '../../content/greek.json' with { type: 'json' };
import { soundOf } from '../../engine/homophones.ts';
import { shuffle } from '../../engine/rng.ts';
import type { Level, Round, Word } from '../../engine/types.ts';
import { MIN_DISTINCT_WORDS, pickWords, wordGraphemes } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const BLEND_SOUNDS_ID = 'blend-sounds';
const CHOICES = 3;
const MAX_SOUNDS: Record<Level, number> = { 1: 4, 2: 5, 3: 6 };
/** αυ/ευ sound /av/ or /af/ depending on the next letter */
const CONTEXT_DEPENDENT = new Set(greek.contextDependentSounds);

export interface BlendSoundsItem {
  wordId: string;
  text: string;
  /** graphemes whose recorded sounds are played in order */
  sounds: string[];
  /** word ids, shown as pictures */
  options: string[];
  target: string;
}

export function canBlend(w: Word): boolean {
  return w.flags.every((f) => f === 'cluster') && !wordGraphemes(w).some((g) => CONTEXT_DEPENDENT.has(g));
}

export function generateBlendSounds(ctx: GenerateContext): Round {
  const withImage = ctx.wordPool.filter((w) => w.imageId);
  const pool = withImage.filter((w) => canBlend(w) && wordGraphemes(w).length <= MAX_SOUNDS[3]);
  const fitting = pool.filter((w) => wordGraphemes(w).length <= MAX_SOUNDS[ctx.level]);
  const words = pickWords(fitting.length >= MIN_DISTINCT_WORDS ? fitting : pool, ctx);

  const items: BlendSoundsItem[] = words.map((w) => {
    const sounds = wordGraphemes(w);
    const firstSound = soundOf(sounds[0]!);
    let others = shuffle(
      withImage.filter((o) => o.id !== w.id && o.imageId !== w.imageId),
      ctx.rng,
    );
    if (ctx.level === 3) {
      const close = others.filter((o) => soundOf(wordGraphemes(o)[0]!) === firstSound);
      others = [...close, ...others.filter((o) => !close.includes(o))];
    }
    const options = shuffle([w.id, ...others.slice(0, CHOICES - 1).map((o) => o.id)], ctx.rng);
    return { wordId: w.id, text: w.text, sounds, options, target: w.id };
  });

  return { id: `${BLEND_SOUNDS_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: BLEND_SOUNDS_ID, seed: 0, level: ctx.level, items };
}
