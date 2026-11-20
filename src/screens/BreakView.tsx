// Break between rounds (PRD §5): the child places what they won in the village.

import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { t } from '../i18n.ts';
import { placeWorldItem, worldItems } from '../storage/progress.ts';
import type { WorldItem } from '../storage/schema.ts';
import { IconButton } from '../ui/IconButton.tsx';
import { NextIcon, VillageIcon } from '../ui/Icons.tsx';
import { Mascot } from '../ui/Mascot.tsx';
import { Picture } from '../ui/Picture.tsx';

type Spot = { x: number; y: number };

/** Somewhere on the grass, right of the mascot. */
export function randomGroundSpot(): Spot {
  return { x: 30 + Math.random() * 62, y: 60 + Math.random() * 30 };
}

/** The freest of a few random spots on the grass, so a new item does not land on another (robot player). */
export function freeGroundSpot(taken: readonly Spot[], tries = 12, random: () => Spot = randomGroundSpot): Spot {
  let best = random();
  let bestGap = -1;
  for (let k = 0; k < tries; k++) {
    const s = k === 0 ? best : random();
    const gap = Math.min(Infinity, ...taken.map((o) => Math.hypot(s.x - o.x, (s.y - o.y) * 1.5)));
    if (gap > bestGap) [best, bestGap] = [s, gap];
  }
  return best;
}

export function useItemLabel() {
  const { content } = useApp();
  return (item: WorldItem) => (item.kind === 'word' ? (content.wordsById.get(item.ref)?.text ?? item.ref) : item.ref);
}

/** The picture of a won item; none when its word left the bank (it is then not shown at all). */
function imageOf(content: ReturnType<typeof useApp>['content'], item: WorldItem): string | undefined {
  return item.kind === 'word' ? content.wordsById.get(item.ref)?.imageId : item.ref;
}

/** The child's won items that still have a picture. */
export function useShownItems() {
  const { db, child, content } = useApp();
  return () => worldItems(db, child.id).then((all) => all.filter((i) => imageOf(content, i)));
}

export function useUnplaced() {
  const { db } = useApp();
  const shown = useShownItems();
  const [items, setItems] = useState<WorldItem[]>([]);
  const taken = useRef<Spot[]>([]);
  useEffect(() => {
    void shown().then((all) => {
      setItems(all.filter((i) => i.x === null));
      taken.current = all.flatMap((i) => (i.x !== null && i.y !== null ? [{ x: i.x, y: i.y }] : []));
    });
  }, []); // once per mount
  /** at `spot` (scene percent) when dropped there, else on a free patch of grass */
  const place = (item: WorldItem, spot = freeGroundSpot(taken.current)) => {
    const { x, y } = spot;
    taken.current = [...taken.current, spot];
    setItems((list) => list.filter((i) => i.id !== item.id));
    return placeWorldItem(db, item.id, x, y);
  };
  return { items, place };
}

export function WorldItemPicture({ item, size }: { item: WorldItem; size: number }) {
  const { content } = useApp();
  const imageId = imageOf(content, item);
  return imageId ? <Picture imageId={imageId} size={size} /> : null;
}

export function BreakView({ onContinue }: { onContinue(): void }) {
  const { audio } = useApp();
  const { items, place } = useUnplaced();
  const label = useItemLabel();
  // what was placed in this break, shown arriving in the village (UI review: it used to just vanish)
  const [arrived, setArrived] = useState<WorldItem[]>([]);

  useEffect(() => {
    void audio.play({ kind: 'instruction', key: 'break' });
    return () => audio.stop();
  }, [audio]);

  return (
    <div className="break">
      <span key={arrived.length} className="mascot-hop">
        <Mascot mood="happy" size={180} />
      </span>
      <div className="break-village" aria-hidden>
        <VillageIcon />
        {arrived.map((item) => (
          <span key={item.id} className="arrived-item">
            <WorldItemPicture item={item} size={56} />
          </span>
        ))}
      </div>
      <div className="tray">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="tray-item"
            aria-label={label(item)}
            onClick={() => {
              setArrived((a) => [...a, item]);
              void place(item);
            }}
          >
            <WorldItemPicture item={item} size={88} />
          </button>
        ))}
      </div>
      <IconButton label={t('nav.next')} variant="primary" onClick={onContinue}>
        <NextIcon />
      </IconButton>
    </div>
  );
}
