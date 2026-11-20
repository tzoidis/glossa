// Where things land in the village (village review: everything was scattered on the
// grass). Water animals and boats go to the pond, what flies to the sky, things of the
// house and food to the garden by Αγκαθούλης's house, the rest to the meadow. The
// areas are in scene percent and match the scenery drawn in Village.tsx (index.css).

import zones from '../content/village.json' with { type: 'json' };
import type { Word } from '../engine/types.ts';

export type Zone = 'pond' | 'sky' | 'garden' | 'meadow';

export interface Spot {
  x: number;
  y: number;
}

/** [x from, x to, y from, y to] in scene percent; a zone may have more than one patch */
const AREAS: Record<Zone, [number, number, number, number][]> = {
  pond: [[70, 88, 81, 91]],
  sky: [[4, 22, 6, 26]],
  garden: [[5, 30, 74, 93]],
  meadow: [
    [34, 62, 58, 93],
    [64, 94, 56, 72],
  ],
};

const POND = new Set(zones.pond);
const SKY = new Set(zones.sky);
const GARDEN = new Set(zones.gardenCategories);

/** The zone of a won word; a decoration from the shop goes to the meadow. */
export function zoneOf(word: Pick<Word, 'id' | 'category'> | undefined): Zone {
  if (!word) return 'meadow';
  if (POND.has(word.id)) return 'pond';
  if (SKY.has(word.id)) return 'sky';
  if (GARDEN.has(word.category)) return 'garden';
  return 'meadow';
}

/** A random spot inside the zone. */
export function randomSpotIn(zone: Zone, random: () => number = Math.random): Spot {
  const patches = AREAS[zone];
  const [x0, x1, y0, y1] = patches[Math.floor(random() * patches.length)]!;
  return { x: x0 + random() * (x1 - x0), y: y0 + random() * (y1 - y0) };
}

/** The freest of a few random spots, so a new item does not land on another (robot player). */
export function freeSpot(taken: readonly Spot[], pick: () => Spot, tries = 12): Spot {
  let best = pick();
  let bestGap = -1;
  for (let k = 0; k < tries; k++) {
    const s = k === 0 ? best : pick();
    const gap = Math.min(Infinity, ...taken.map((o) => Math.hypot(s.x - o.x, (s.y - o.y) * 1.5)));
    if (gap > bestGap) [best, bestGap] = [s, gap];
  }
  return best;
}
