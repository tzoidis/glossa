// «Μεγάλα και μικρά»: memory with up to 8 cards, each capital with its small
// letter (Γ/γ, Δ/δ, Λ/λ). PRD §4: on purpose mostly pairs that look very
// different (greek.json caseLooksDifferent), the ones a child cannot match by shape.
// Levels: 1 three pairs; 2 four pairs; 3 four pairs, only different-looking ones.
// Letters due for review and the newest letter come first, whatever their shape.

import greek from '../../content/greek.json' with { type: 'json' };
import { graphemes } from '../../engine/greekTokenizer.ts';
import { shuffle } from '../../engine/rng.ts';
import type { Round } from '../../engine/types.ts';
import { NotEnoughContent } from '../pool.ts';
import type { GenerateContext } from '../types.ts';

export const UPPER_LOWER_ID = 'upper-lower';
/** boards per round: a memory board takes longer than one question */
export const BOARDS = 3;

export interface MemoryCard {
  id: string;
  /** the small letter: the pair's key */
  letter: string;
  text: string;
}

export interface UpperLowerItem {
  /** the small letters of the pairs, for the demo and the log */
  target: string;
  pairs: string[];
  cards: MemoryCard[];
}

const DIFFERENT = new Set(greek.caseLooksDifferent);

export function generateUpperLower(ctx: GenerateContext): Round {
  const letters = [...ctx.allowedGraphemes].filter((g) => graphemes(g).length === 1 && g.length === 1 && g.toLocaleUpperCase('el') !== g);
  if (letters.length < 3) throw new NotEnoughContent('fewer than 3 letters');
  const size = Math.min(ctx.level === 1 ? 3 : 4, letters.length);
  const newest = letters.at(-1)!;
  const due = new Set(ctx.reviewQueue.filter((k) => k.startsWith('case:')).map((k) => k.slice('case:'.length)));

  const items: UpperLowerItem[] = [];
  for (let b = 0; b < BOARDS; b++) {
    const shuffled = shuffle(letters, ctx.rng);
    const different = shuffled.filter((g) => DIFFERENT.has(g));
    const preferred = ctx.level === 3 && different.length >= size ? different : [...different, ...shuffled.filter((g) => !DIFFERENT.has(g))];
    const first = [...preferred.filter((g) => due.has(g)), ...(b === 0 ? [newest] : [])];
    const pairs = [...new Set([...first, ...preferred])].slice(0, size);
    const cards = shuffle(
      pairs.flatMap((g) => [
        { id: `${g}-upper`, letter: g, text: g.toLocaleUpperCase('el') },
        { id: `${g}-lower`, letter: g, text: g },
      ]),
      ctx.rng,
    );
    items.push({ target: [...pairs].sort().join(''), pairs, cards });
  }
  return { id: `${UPPER_LOWER_ID}-${Math.floor(ctx.rng() * 1e9)}`, exerciseId: UPPER_LOWER_ID, seed: 0, level: ctx.level, items };
}
