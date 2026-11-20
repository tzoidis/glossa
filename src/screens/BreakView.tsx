// Break between rounds (PRD §5): the child places what they won in the village.

import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { t } from '../i18n.ts';
import { placeWorldItem, worldItems } from '../storage/progress.ts';
import type { WorldItem } from '../storage/schema.ts';
import { IconButton } from '../ui/IconButton.tsx';
import { NextIcon, VillageIcon } from '../ui/Icons.tsx';
import { DressedMascot } from '../village/DressedMascot.tsx';
import { Picture } from '../ui/Picture.tsx';
import { freeSpot, randomSpotIn, zoneOf, type Spot } from '../village/zones.ts';

export function useItemLabel() {
  const { content } = useApp();
  return (item: WorldItem) => (item.kind === 'word' ? (content.wordsById.get(item.ref)?.text ?? item.ref) : t('shop.decoration'));
}

/** The picture of a won item; none when its word left the bank (it is then not shown at all), or for an outfit (worn, not placed). */
function imageOf(content: ReturnType<typeof useApp>['content'], item: WorldItem): string | undefined {
  if (item.kind === 'outfit') return undefined;
  return item.kind === 'word' ? content.wordsById.get(item.ref)?.imageId : item.ref;
}

/** The child's won items that still have a picture. */
export function useShownItems() {
  const { db, child, content } = useApp();
  return () => worldItems(db, child.id).then((all) => all.filter((i) => imageOf(content, i)));
}

export function useUnplaced() {
  const { db, content } = useApp();
  const shown = useShownItems();
  const [items, setItems] = useState<WorldItem[]>([]);
  const taken = useRef<Spot[]>([]);
  const load = () =>
    shown().then((all) => {
      setItems(all.filter((i) => i.x === null));
      taken.current = all.flatMap((i) => (i.x !== null && i.y !== null ? [{ x: i.x, y: i.y }] : []));
    });
  useEffect(() => {
    void load();
  }, []); // once per mount; reload() after buying a decoration
  /** at `spot` (scene percent) when dropped there, else on a free spot of its place (pond, sky, garden, meadow) */
  const place = (item: WorldItem, spot = freeSpot(taken.current, () => randomSpotIn(zoneOf(item.kind === 'word' ? content.wordsById.get(item.ref) : undefined)))) => {
    const { x, y } = spot;
    taken.current = [...taken.current, spot];
    setItems((list) => list.filter((i) => i.id !== item.id));
    return placeWorldItem(db, item.id, x, y);
  };
  return { items, place, reload: load };
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
        <DressedMascot mood="happy" size={180} />
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
