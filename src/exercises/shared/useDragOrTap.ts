// Every drag also works as a tap (PRD §4). A short press is a tap; a drag that
// ends over a drop zone (generous "magnet" area) counts as a drop there.

import { useRef, useState, type PointerEvent } from 'react';

const TAP_SLOP_PX = 10;

export interface DragHandlers {
  onPointerDown(e: PointerEvent<HTMLElement>): void;
  onPointerMove(e: PointerEvent<HTMLElement>): void;
  onPointerUp(e: PointerEvent<HTMLElement>): void;
  onPointerCancel(): void;
  style: { transform?: string; zIndex?: number };
}

/** dropZone: CSS selector of elements that accept a drop. */
export function useDragOrTap(onActivate: () => void, dropZone: string): DragHandlers {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);

  return {
    onPointerDown(e) {
      start.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e) {
      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (offset || Math.hypot(dx, dy) > TAP_SLOP_PX) setOffset({ x: dx, y: dy });
    },
    onPointerUp(e) {
      const wasDrag = offset !== null;
      start.current = null;
      setOffset(null);
      if (!wasDrag) return onActivate();
      const zones = document.querySelectorAll(dropZone);
      const hit = [...zones].some((z) => {
        const r = z.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      });
      if (hit) onActivate();
    },
    onPointerCancel() {
      start.current = null;
      setOffset(null);
    },
    style: offset ? { transform: `translate(${offset.x}px, ${offset.y}px)`, zIndex: 10 } : {},
  };
}
