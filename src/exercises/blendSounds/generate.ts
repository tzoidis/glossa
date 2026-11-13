// «Ενώνω συλλαβές με το αυτί»: hear «νε… ρό» one syllable at a time (bundled
// syllable clips), pick the picture from 3. No text on screen, so any bank word
// with a picture works. Levels: up to 3 syllables, then 4, then 5 with pictures
// that start with the same syllable sound.

import { syllableSoundKey } from '../../engine/homophones.ts';
import { shuffle } from '../../engine/rng.ts';
import type { Level, Round } from '../../engine/types.ts';
import { distinctPictures, MIN_DISTINCT_WORDS, pickWords } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const BLEND_SOUNDS_ID = 'blend-sounds';
const CHOICES = 3;
const MAX_SYLLABLES: Record<Level, number> = { 1: 3, 2: 4, 3: 5 };

export interface BlendSoundsItem {
  wordId: string;
  text: string;
  /** syllables played in order */
  syllables: string[];
  /** word ids, shown as pictures */
  options: string[];
  target: string;
}

export function generateBlendSounds(ctx: GenerateContext): Round {
  const withImage = ctx.wordPool.filter((w) => w.imageId);
  const pool = withImage.filter((w) => w.syllables.length >= 2 && w.syllables.length <= MAX_SYLLABLES[3]);
  const fitting = pool.filter((w) => w.syllables.length <= MAX_SYLLABLES[ctx.level]);
  const words = pickWords(fitting.length >= MIN_DISTINCT_WORDS ? fitting : pool, ctx);

  const items: BlendSoundsItem[] = words.map((w) => {
    const first = syllableSoundKey(w.syllables[0]!);
    let others = distinctPictures(
      shuffle(
        withImage.filter((o) => o.id !== w.id && o.imageId !== w.imageId),
        ctx.rng,
      ),
    );
    if (ctx.level === 3) {
      const close = others.filter((o) => syllableSoundKey(o.syllables[0]!) === first);
      others = [...close, ...others.filter((o) => !close.includes(o))];
    }
    const options = shuffle([w.id, ...others.slice(0, CHOICES - 1).map((o) => o.id)], ctx.rng);
    return { wordId: w.id, text: w.text, syllables: w.syllables, options, target: w.id };
  });

  return { id: `${BLEND_SOUNDS_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: BLEND_SOUNDS_ID, seed: 0, level: ctx.level, items };
}
