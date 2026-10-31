// Break between rounds (PRD §5): the child places what they won in the village.

import { useEffect, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { t } from '../i18n.ts';
import { placeWorldItem, worldItems } from '../storage/progress.ts';
import type { WorldItem } from '../storage/schema.ts';
import { IconButton } from '../ui/IconButton.tsx';
import { NextIcon } from '../ui/Icons.tsx';
import { Mascot } from '../ui/Mascot.tsx';
import { Picture } from '../ui/Picture.tsx';

/** Somewhere on the grass, right of the mascot. */
export function randomGroundSpot(): { x: number; y: number } {
  return { x: 30 + Math.random() * 62, y: 60 + Math.random() * 30 };
}

export function useItemLabel() {
  const { content } = useApp();
  return (item: WorldItem) => (item.kind === 'word' ? (content.wordsById.get(item.ref)?.text ?? item.ref) : item.ref);
}

export function useUnplaced() {
  const { db, child } = useApp();
  const [items, setItems] = useState<WorldItem[]>([]);
  useEffect(() => {
    void worldItems(db, child.id).then((all) => setItems(all.filter((i) => i.x === null)));
  }, [db, child.id]);
  /** at `spot` (scene percent) when dropped there, else somewhere on the grass */
  const place = (item: WorldItem, spot = randomGroundSpot()) => {
    const { x, y } = spot;
    setItems((list) => list.filter((i) => i.id !== item.id));
    return placeWorldItem(db, item.id, x, y);
  };
  return { items, place };
}

export function WorldItemPicture({ item, size }: { item: WorldItem; size: number }) {
  const { content } = useApp();
  const imageId = item.kind === 'word' ? content.wordsById.get(item.ref)?.imageId : item.ref;
  return imageId ? <Picture imageId={imageId} size={size} /> : null;
}

export function BreakView({ onContinue }: { onContinue(): void }) {
  const { audio } = useApp();
  const { items, place } = useUnplaced();
  const label = useItemLabel();

  useEffect(() => {
    void audio.play({ kind: 'instruction', key: 'break' });
    return () => audio.stop();
  }, [audio]);

  return (
    <div className="break">
      <Mascot mood="happy" size={180} />
      <div className="tray">
        {items.map((item) => (
          <button key={item.id} type="button" className="tray-item" aria-label={label(item)} onClick={() => void place(item)}>
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
