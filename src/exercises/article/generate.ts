// «Ο, η ή το;»: a written word with a gap before it («__ γάτα»); the child picks
// the article. The picture shows only once it is found: with it a native speaker
// knows the article without reading the word. The word is reading material: heard only if the
// child asks, or slowly after a mistake.
// Levels: 1 words whose ending gives the article away (-α/-η, -ο/-ι, -ος/-ας/-ης);
// 2 any; 3 mid-round, the ones whose ending says nothing (το κανό, η αλεπού).
// Plural (PRD §4, from unit 3, once «οι» is taught): 1 item at level 1, 2 from level 2,
// «__ γάτες» with the word's own article and οι, τα; the picture then shows several.

import greek from '../../content/greek.json' with { type: 'json' };
import { graphemes, lowerKey } from '../../engine/greekTokenizer.ts';
import { shuffle } from '../../engine/rng.ts';
import type { Round, Word } from '../../engine/types.ts';
import { areTaught, isEasyPosition, isReadable, NotEnoughContent, pickWords } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const ARTICLE_ID = 'article';
export const ARTICLES = greek.articles;
const PLURAL_ARTICLES: Record<string, string> = greek.pluralArticles;

export interface ArticleItem {
  wordId: string;
  text: string;
  imageId: string;
  target: string;
  options: string[];
  plural?: true;
}

/** The clip of a plural form: `word/<id>-plural`. */
export const pluralClipId = (wordId: string) => `${wordId}-plural`;

/** The plural as a word of its own (text, syllables, flags, clip id), or null for a word without one. */
export function asPlural(w: Word): Word | null {
  if (!w.plural || !w.article) return null;
  let p = plurals.get(w);
  if (!p) {
    const { plural, minPosition: _m, ...rest } = w;
    p = { ...rest, id: pluralClipId(w.id), text: plural.text, syllables: plural.syllables, flags: plural.flags, graphemes: graphemes(plural.text) };
    plurals.set(w, p);
  }
  return p;
}
// one per word: every round checks each plural, and tokenizing is the slow part
const plurals = new WeakMap<Word, Word>();

/** Where the plural items go, by level: never the first item or the closing one; level 3 keeps item 2 for a tricky word. */
const PLURAL_SLOTS = { 1: [2], 2: [2, 3], 3: [1, 3] } as const;

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
  const base = ctx.level === 1 && easy.length >= 3 ? easy : pool;
  let words = pickWords(base, ctx);
  if (ctx.level === 3) {
    const tricky = shuffle(
      pool.filter((w) => !regular(w) && !words.includes(w)),
      ctx.rng,
    );
    words = words.map((w, i) => (!isEasyPosition(i) && tricky.length ? tricky.shift()! : w));
  }

  // plurals once «οι» and «τα» can be read, each only where the plural form is readable too
  const pluralOk = Object.values(PLURAL_ARTICLES).every((a) => areTaught(graphemes(a), ctx));
  const readablePlural = (w: Word) => {
    const p = asPlural(w);
    return !!p && isReadable(p, ctx);
  };
  const plural = new Set<number>();
  if (pluralOk) {
    const spare = shuffle(
      base.filter((w) => readablePlural(w) && !words.includes(w)),
      ctx.rng,
    );
    for (const i of PLURAL_SLOTS[ctx.level]) {
      if (i >= words.length) continue;
      if (!readablePlural(words[i]!)) {
        if (!spare.length) continue;
        words[i] = spare.shift()!;
      }
      plural.add(i);
    }
  }

  const items: ArticleItem[] = words.map((w, i) => {
    if (!plural.has(i)) return { wordId: w.id, text: w.text, imageId: w.imageId!, target: w.article!, options: [...ARTICLES] };
    const target = PLURAL_ARTICLES[w.article!]!;
    const options = [...new Set([w.article!, ...Object.values(PLURAL_ARTICLES)])];
    return { wordId: w.id, text: w.plural!.text, imageId: w.imageId!, target, options, plural: true };
  });
  return { id: `${ARTICLE_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: ARTICLE_ID, seed: 0, level: ctx.level, items };
}
