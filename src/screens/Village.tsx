// The mascot's village: every word solved becomes something in it (PRD §5).

import { useEffect, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { t } from '../i18n.ts';
import { worldItems } from '../storage/progress.ts';
import type { WorldItem } from '../storage/schema.ts';
import { IconButton } from '../ui/IconButton.tsx';
import { HomeIcon, StarIcon } from '../ui/Icons.tsx';
import { Mascot } from '../ui/Mascot.tsx';
import { useItemLabel, useUnplaced, WorldItemPicture } from './BreakView.tsx';

export function Village({ onHome }: { onHome(): void }) {
  const { db, child } = useApp();
  const [placed, setPlaced] = useState<WorldItem[]>([]);
  const { items: unplaced, place } = useUnplaced();
  const label = useItemLabel();

  useEffect(() => {
    void worldItems(db, child.id).then((all) => setPlaced(all.filter((i) => i.x !== null)));
  }, [db, child.id, unplaced.length]);

  return (
    <main className="screen village">
      <div className="village-scene">
        <div className="village-sun" />
        <div className="village-ground" />
        <div className="village-mascot">
          <Mascot mood="happy" size={150} />
        </div>
        {placed.map((item) => (
          <div key={item.id} className="village-item" style={{ left: `${item.x}%`, top: `${item.y}%` }}>
            <WorldItemPicture item={item} size={64} />
          </div>
        ))}
      </div>
      <div className="village-bar">
        <IconButton label={t('nav.home')} onClick={onHome}>
          <HomeIcon />
        </IconButton>
        <div className="tray">
          {unplaced.map((item) => (
            <button key={item.id} type="button" className="tray-item" aria-label={label(item)} onClick={() => void place(item)}>
              <WorldItemPicture item={item} size={64} />
            </button>
          ))}
        </div>
        <div className="star-count" aria-label={t('village.stars')}>
          <StarIcon size={48} />
          <span>{child.stars}</span>
        </div>
      </div>
    </main>
  );
}
