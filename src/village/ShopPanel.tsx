// The star shop, opened from the star count in the village (PRD §5). Wordless like
// every child screen: a picture and its price in stars. What the child cannot afford
// yet is dimmed, and a tap on it says to gather more stars. An outfit already owned is
// put on or taken off with a tap; a decoration goes to the village tray.

import { useEffect, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { t } from '../i18n.ts';
import { buyShopItem, setWearing } from '../storage/progress.ts';
import { IconButton } from '../ui/IconButton.tsx';
import { CheckIcon, NextIcon, StarIcon } from '../ui/Icons.tsx';
import { Picture } from '../ui/Picture.tsx';
import { Dressed } from './DressedMascot.tsx';
import { SHOP, takingOff, wearing, type ShopItem } from './shop.ts';

export function ShopPanel({ onClose, onBought }: { onClose(): void; onBought(item: ShopItem): void }) {
  const { db, child, audio, refresh } = useApp();
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const worn = child.wearing ?? [];

  useEffect(() => {
    void audio.play({ kind: 'instruction', key: 'shop' });
    void db.world
      .where('childId')
      .equals(child.id)
      .filter((i) => i.kind === 'outfit')
      .toArray()
      .then((items) => setOwned(new Set(items.map((i) => i.ref))));
    return () => audio.stop();
  }, [audio, db, child.id]);

  const tap = async (item: ShopItem) => {
    audio.stop();
    if (item.kind === 'outfit' && owned.has(item.id)) {
      await setWearing(db, child.id, worn.includes(item.id) ? takingOff(worn, item.id) : wearing(worn, item.id));
      await refresh();
      return;
    }
    if (child.stars < item.price) {
      void audio.play({ kind: 'instruction', key: 'shop-more' });
      return;
    }
    if (await buyShopItem(db, child.id, item, (current) => wearing(current, item.id))) {
      if (item.kind === 'outfit') setOwned((s) => new Set(s).add(item.id));
      await refresh();
      onBought(item);
      void audio.play({ kind: 'praise', key: String(1 + Math.floor(Math.random() * 3)) });
    }
  };

  const tile = (item: ShopItem) => {
    const have = item.kind === 'outfit' && owned.has(item.id);
    const on = worn.includes(item.id);
    const locked = !have && child.stars < item.price;
    return (
      <button
        key={item.id}
        type="button"
        className={`shop-item${locked ? ' shop-item--locked' : ''}${on ? ' shop-item--worn' : ''}`}
        aria-label={item.kind === 'outfit' ? t('shop.outfit') : t('shop.decoration')}
        onClick={() => void tap(item)}
      >
        <Picture imageId={item.id} size={64} />
        {have ? (
          <span className="shop-item__price">{on && <CheckIcon />}</span>
        ) : (
          <span className="shop-item__price">
            <StarIcon size={22} />
            {item.price}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="shop" role="dialog" aria-label={t('shop.open')}>
      <div className="shop__top">
        <Dressed wearing={worn} mood="happy" size={110} />
        <div className="star-count" aria-label={t('village.stars')}>
          <StarIcon size={48} />
          <span>{child.stars}</span>
        </div>
        <IconButton label={t('shop.close')} variant="primary" onClick={onClose}>
          <NextIcon />
        </IconButton>
      </div>
      <div className="shop__row">{SHOP.filter((i) => i.kind === 'outfit').map(tile)}</div>
      <div className="shop__row">{SHOP.filter((i) => i.kind === 'decoration').map(tile)}</div>
    </div>
  );
}
