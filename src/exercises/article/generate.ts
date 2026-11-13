// «Ο, η ή το;»: a written word with a gap before it («__ γάτα»); the child picks
// the article. The picture shows only once it is found: with it a native speaker
// knows the article without reading the word. The word is reading material: heard only if the
// child asks, or slowly after a mistake.
// Levels: 1 words whose ending gives the article away (-α/-η, -ο/-ι, -ος/-ας/-ης);
// 2 any; 3 mid-round, the ones whose ending says nothing (το κανό, η αλεπού).

import greek from '../../content/greek.json' with { type: 'json' };
import { graphemes, lowerKey } from '../../engine/greekTokenizer.ts';
import { shuffle } from '../../engine/rng.ts';
import type { Round, Word } from '../../engine/types.ts';
import { areTaught, isEasyPosition, isReadable, NotEnoughContent, pickWords } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const ARTICLE_ID = 'article';
export const ARTICLES = greek.articles;

export interface ArticleItem {
  wordId: string;
  text: string;
  imageId: string;
  target: string;
  options: string[];
}

const ENDINGS = Object.entries(greek.articleEndings)
  .flatMap(([article, endings]) => endings.map((ending) => ({ article, ending })))
  .sort((a, b) => b.ending.length - a.ending.length);

const plain = (text: string) => lowerKey(text).normalize('NFD').replace(/\p{M}/gu, '');

/** The article the ending suggests; null when the ending says nothing clear. */
export function articleByEnding(text: string): string | null {
  const w = plain(text);
  return ENDINGS.find((e) => w.endsWith(e.ending))?.article ?? null;
}

const regular = (w: Word) => articleByEnding(w.text) === w.article;

export function generateArticle(ctx: GenerateContext): Round {
  if (!ARTICLES.every((a) => areTaught(graphemes(a), ctx))) throw new NotEnoughContent('articles not readable yet');
  const pool = ctx.wordPool.filter((w) => w.imageId && w.article && isReadable(w, ctx));
  const easy = pool.filter(regular);
  let words = pickWords(ctx.level === 1 && easy.length >= 3 ? easy : pool, ctx);
  if (ctx.level === 3) {
    const tricky = shuffle(
      pool.filter((w) => !regular(w) && !words.includes(w)),
      ctx.rng,
    );
    words = words.map((w, i) => (!isEasyPosition(i) && tricky.length ? tricky.shift()! : w));
  }

  const items: ArticleItem[] = words.map((w) => ({
    wordId: w.id,
    text: w.text,
    imageId: w.imageId!,
    target: w.article!,
    options: [...ARTICLES],
  }));
  return { id: `${ARTICLE_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: ARTICLE_ID, seed: 0, level: ctx.level, items };
}
