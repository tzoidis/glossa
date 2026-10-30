// «Λέξη και εικόνα»: read one written word, pick its picture from 3 (4 at higher
// levels). The word is reading material, so it is not spoken unless the child asks
// (and that counts as help). Level 3: wrong pictures start with the same letter.

import { shuffle } from '../../engine/rng.ts';
import type { Round } from '../../engine/types.ts';
import { isEasyPosition, isReadable, pickWords, wordGraphemes } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const WORD_PICTURE_ID = 'word-picture';

export interface WordPictureItem {
  wordId: string;
  text: string;
  /** word ids; each shown as its picture */
  options: string[];
  target: string;
}

export function generateWordPicture(ctx: GenerateContext): Round {
  const withImage = ctx.wordPool.filter((w) => w.imageId);
  const readable = withImage.filter((w) => isReadable(w, ctx));
  const words = pickWords(readable, ctx);

  const items: WordPictureItem[] = words.map((w, i) => {
    const hard = ctx.level > 1 && !isEasyPosition(i);
    const count = hard ? 4 : 3;
    const first = wordGraphemes(w)[0];
    let others = shuffle(
      withImage.filter((o) => o.id !== w.id && o.imageId !== w.imageId),
      ctx.rng,
    );
    if (ctx.level === 3 && hard) others = [...others.filter((o) => wordGraphemes(o)[0] === first), ...others.filter((o) => wordGraphemes(o)[0] !== first)];
    const options = shuffle([w.id, ...others.slice(0, count - 1).map((o) => o.id)], ctx.rng);
    return { wordId: w.id, text: w.text, options, target: w.id };
  });

  return { id: `${WORD_PICTURE_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: WORD_PICTURE_ID, seed: 0, level: ctx.level, items };
}
