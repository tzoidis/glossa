// The mascot's village: every word solved becomes something in it (PRD §5).
// The child moves things around with a finger; a new item is dragged from the
// tray to where it should go, or tapped to land somewhere on the grass.

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { t } from '../i18n.ts';
import { placeWorldItem, worldItems } from '../storage/progress.ts';
import type { WorldItem } from '../storage/schema.ts';
import { IconButton } from '../ui/IconButton.tsx';
import { HomeIcon, StarIcon } from '../ui/Icons.tsx';
import { Mascot } from '../ui/Mascot.tsx';
import { useItemLabel, useUnplaced, WorldItemPicture } from './BreakView.tsx';
import { insideScene, scenePercent } from './villageDrag.ts';

const TAP_SLOP_PX = 10;

export function Village({ onHome }: { onHome(): void }) {
  const { db, child } = useApp();
  const [placed, setPlaced] = useState<WorldItem[]>([]);
  const { items: unplaced, place } = useUnplaced();
  const label = useItemLabel();
  const scene = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void worldItems(db, child.id).then((all) => setPlaced(all.filter((i) => i.x !== null)));
  }, [db, child.id, unplaced.length]);

  // the last item moved stays on top; the list keeps its order, since moving a
  // DOM node would replay every item's pop-in
  const [top, setTop] = useState<string | null>(null);
  const move = (id: string, x: number, y: number) => {
    setPlaced((list) => list.map((i) => (i.id === id ? { ...i, x, y } : i)));
    setTop(id);
    void placeWorldItem(db, id, x, y);
  };

  return (
    <main className="screen village">
      <div className="village-scene" ref={scene}>
        <div className="village-sun" />
        <div className="village-ground" />
        <div className="village-mascot">
          <Mascot mood="happy" size={150} />
        </div>
        {placed.map((item) => (
          <PlacedItem key={item.id} item={item} scene={scene} label={label(item)} onTop={item.id === top} onMove={(x, y) => move(item.id, x, y)} />
        ))}
      </div>
      <div className="village-bar">
        <IconButton label={t('nav.home')} onClick={onHome}>
          <HomeIcon />
        </IconButton>
        <div className="tray">
          {unplaced.map((item) => (
            <TrayItem key={item.id} item={item} scene={scene} label={label(item)} onPlace={(spot) => void place(item, spot)} />
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

function PlacedItem(props: {
  item: WorldItem;
  scene: RefObject<HTMLDivElement | null>;
  label: string;
  onTop: boolean;
  onMove(x: number, y: number): void;
}) {
  const { item, scene } = props;
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const at = (e: PointerEvent<HTMLElement>) => {
    const rect = scene.current!.getBoundingClientRect();
    return scenePercent(e.clientX - grab.current!.dx, e.clientY - grab.current!.dy, rect);
  };

  return (
    <div
      className={`village-item${pos ? ' village-item--moving' : ''}`}
      role="img"
      aria-label={props.label}
      style={{ left: `${pos?.x ?? item.x}%`, top: `${pos?.y ?? item.y}%`, zIndex: props.onTop ? 5 : undefined }}
      onPointerDown={(e) => {
        // where the finger is from the item's centre, so the item does not jump
        const r = e.currentTarget.getBoundingClientRect();
        grab.current = { dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2) };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (grab.current) setPos(at(e));
      }}
      onPointerUp={(e) => {
        if (!grab.current) return;
        if (pos) {
          const { x, y } = at(e);
          props.onMove(x, y);
        }
        grab.current = null;
        setPos(null);
      }}
      onPointerCancel={() => {
        grab.current = null;
        setPos(null);
      }}
    >
      <WorldItemPicture item={item} size={64} />
    </div>
  );
}

function TrayItem(props: { item: WorldItem; scene: RefObject<HTMLDivElement | null>; label: string; onPlace(spot?: { x: number; y: number }): void }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <button
        type="button"
        className={`tray-item${ghost ? ' tray-item--lifted' : ''}`}
        aria-label={props.label}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          if (ghost || Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > TAP_SLOP_PX) setGhost({ x: e.clientX, y: e.clientY });
        }}
        onPointerUp={(e) => {
          if (!start.current) return;
          start.current = null;
          setGhost(null);
          // a tap (or the keyboard) places it on the grass; a drag places it where it is let go
          if (!ghost) return props.onPlace();
          const rect = props.scene.current!.getBoundingClientRect();
          if (insideScene(e.clientX, e.clientY, rect)) props.onPlace(scenePercent(e.clientX, e.clientY, rect));
        }}
        onPointerCancel={() => {
          start.current = null;
          setGhost(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            props.onPlace();
          }
        }}
      >
        <WorldItemPicture item={props.item} size={64} />
      </button>
      {ghost && (
        <div className="village-ghost" style={{ left: ghost.x, top: ghost.y }}>
          <WorldItemPicture item={props.item} size={64} />
        </div>
      )}
    </>
  );
}
