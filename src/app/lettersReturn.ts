// The story pays off (game review): Αγκαθούλης lost the letters of the village, and
// each letter the class learns comes back. When the parent moves the letter on, the
// child sees it return once, after «Πάμε!»; the village board shows every letter found.

import type { GlossaDb } from '../storage/db.ts';
import type { Child } from '../storage/schema.ts';

/** A big jump (the parent's first setup, a missed week) shows only the latest letters. */
export const MAX_RETURNING = 3;

/**
 * The letters to welcome back now, in book order: those taught since the child last
 * saw letters return. None before the child's first round (the parent is setting up)
 * or in the thematic units (no new letters).
 */
export function returningLetters(order: readonly string[], position: number, child: Pick<Child, 'lettersReturned' | 'roundsPlayed'>): string[] {
  const from = child.lettersReturned;
  if (from === undefined || child.roundsPlayed === 0) return [];
  const to = Math.min(position, order.length);
  if (to <= from) return [];
  return order.slice(Math.max(from, to - MAX_RETURNING), to);
}

/** Remembers that the letters up to `position` came back (it never goes down, so a letter returns once). */
export async function markLettersReturned(db: GlossaDb, childId: string, position: number): Promise<void> {
  await db.transaction('rw', db.children, async () => {
    const child = await db.children.get(childId);
    if (!child) return;
    const next = Math.max(child.lettersReturned ?? 0, position);
    if (next !== child.lettersReturned) await db.children.update(childId, { lettersReturned: next });
  });
}
