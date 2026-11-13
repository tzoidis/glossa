// «Δικές μου λέξεις»: every listed name added (with a picture) must leave the
// games valid. Games without `names` never see one (they split words into small
// letters); the six with it may, and still follow the allowed-words rule.

import { describe, expect, it } from 'vitest';
import { buildGenerateContext } from '../app/generateContext.ts';
import { CONTENT, NAME_TAG, NAMES, withCustomWords } from '../app/content.ts';
import { isTextAllowed, makeContext } from '../engine/allowedWords.ts';
import type { Level } from '../engine/types.ts';
import type { CustomWord } from '../storage/schema.ts';
import { NotEnoughContent } from './pool.ts';
import { EXERCISES } from './registry.ts';

const customs: CustomWord[] = NAMES.map((n, i) => ({
  id: n.id,
  childId: 'child-1',
  text: n.text,
  article: n.article,
  syllables: n.syllables,
  kind: 'name',
  imageId: i % 2 ? '1F467' : '1F466',
  createdAt: 0,
}));
const content = withCustomWords(CONTENT, customs);
const nameIds = new Set(NAMES.map((n) => n.id));
const POSITIONS = [10, 20, 30, CONTENT.order.maxPosition];
const LEVELS: Level[] = [1, 2, 3];
const SEEDS = 12;
// the name games that put the word on screen (the sound games only say it and show the picture)
const READ_WHOLE = new Set(['word-picture', 'join-syllables', 'which-word', 'article']);

describe('names in the games', () => {
  it('come in as name-tagged words with their listed syllables', () => {
    const maria = content.wordsById.get('name-maria')!;
    expect(maria.tags).toContain(NAME_TAG);
    expect(maria.syllables).toEqual(['Μα', 'ρί', 'α']);
    expect(maria.minPosition).toBeGreaterThan(0);
  });

  it.each(EXERCISES.map((e) => [e.module.id, e] as const))('%s', (_id, entry) => {
    let sawName = false;
    for (const position of POSITIONS) {
      const allow = makeContext(content.curriculum, { position }, content.words);
      for (const level of LEVELS) {
        for (let seed = 1; seed <= SEEDS; seed++) {
          const ctx = buildGenerateContext({ content, allow, level, recentWordIds: [], reviewQueue: [], seed, names: entry.names });
          let round;
          try {
            round = entry.module.generate(ctx);
          } catch (e) {
            if (e instanceof NotEnoughContent) continue;
            throw new Error(`${entry.module.id} position=${position} level=${level} seed=${seed}: ${(e as Error).message}`);
          }
          const json = JSON.stringify(round.items);
          const used = [...nameIds].filter((id) => json.includes(`"${id}"`));
          if (!entry.names) expect(used, `${entry.module.id} seed=${seed}`).toEqual([]);
          if (used.length) sawName = true;
          // a game that shows the word whole picks only readable words: a name too
          if (READ_WHOLE.has(entry.module.id)) {
            // in «Λέξη και εικόνα» only the asked word is written; the choices are pictures
            const shown = entry.module.id === 'word-picture' ? round.items.map((i) => (i as { wordId: string }).wordId).filter((id) => nameIds.has(id)) : used;
            for (const id of shown) {
              const text = content.wordsById.get(id)!.text;
              expect(isTextAllowed(text, allow), `${entry.module.id}: ${text} at ${position}`).toBe(true);
            }
          }
        }
      }
    }
    if (entry.names) expect(sawName, `${entry.module.id} never used a name`).toBe(true);
  });
});
