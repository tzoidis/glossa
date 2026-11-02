// «Ποια λέξη ακούς;»: a word is heard, the child taps it among 3 written words
// (4 at higher levels). Every word on screen is readable (PRD §3), and none sounds
// like the one heard (PRD §4: πόδι/πώδι would be two right answers).
// Level 3: wrong words start with the same letter, so the whole word must be read.

import { soundOf } from '../../engine/homophones.ts';
import { shuffle } from '../../engine/rng.ts';
import type { Round, Word } from '../../engine/types.ts';
import { isEasyPosition, isReadable, MIN_DISTINCT_WORDS, NotEnoughContent, pickWords, wordGraphemes } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const WHICH_WORD_ID = 'which-word';

export interface WhichWordItem {
  wordId: string;
  text: string;
  /** word ids, each shown as its written word */
  options: string[];
  target: string;
}

// what a word sounds like, grapheme by grapheme (wordsSoundSame as a key), worked out once
const sounds = new WeakMap<Word, string>();
function soundKey(w: Word): string {
  let key = sounds.get(w);
  if (key === undefined) sounds.set(w, (key = wordGraphemes(w).map(soundOf).join('|')));
  return key;
}

export function generateWhichWord(ctx: GenerateContext): Round {
  const readable = ctx.wordPool.filter((w) => isReadable(w, ctx));
  if (readable.length < MIN_DISTINCT_WORDS + 1) throw new NotEnoughContent('fewer than 4 readable words');
  const words = pickWords(readable, ctx);

  const items: WhichWordItem[] = words.map((w, i) => {
    const hard = ctx.level > 1 && !isEasyPosition(i);
    const count = hard ? 4 : 3;
    const first = wordGraphemes(w)[0];
    let others = shuffle(
      readable.filter((o) => o.id !== w.id && soundKey(o) !== soundKey(w)),
      ctx.rng,
    );
    const close = (o: Word) => wordGraphemes(o)[0] === first;
    if (ctx.level === 3 && hard) others = [...others.filter(close), ...others.filter((o) => !close(o))];
    // at most one written form per sound among the choices
    const picked: Word[] = [];
    for (const o of others) {
      if (picked.length === count - 1) break;
      if (!picked.some((p) => soundKey(p) === soundKey(o))) picked.push(o);
    }
    return { wordId: w.id, text: w.text, options: shuffle([w.id, ...picked.map((o) => o.id)], ctx.rng), target: w.id };
  });

  return { id: `${WHICH_WORD_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: WHICH_WORD_ID, seed: 0, level: ctx.level, items };
}
