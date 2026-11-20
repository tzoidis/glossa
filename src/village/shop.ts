// What the stars buy (PRD §5: stars dress the mascot and decorate the village). An
// outfit is bought once and worn by Αγκαθούλης, one per place (head, face, neck); a
// decoration can be bought again and goes to the village tray like a won word. Prices
// are in stars; a child earns one star per round, three on a full day. Ids are OpenMoji
// codes (bundled by scripts/build-openmoji-subset.ts).

export type Slot = 'head' | 'face' | 'neck';

export interface ShopItem {
  id: string;
  kind: 'outfit' | 'decoration';
  price: number;
  slot?: Slot;
}

export const SHOP: readonly ShopItem[] = [
  { id: '1F380', kind: 'outfit', price: 2, slot: 'head' }, // ribbon
  { id: '1F9E3', kind: 'outfit', price: 3, slot: 'neck' }, // scarf
  { id: '1F576', kind: 'outfit', price: 3, slot: 'face' }, // sunglasses
  { id: '1F3A9', kind: 'outfit', price: 4, slot: 'head' }, // top hat
  { id: '1F393', kind: 'outfit', price: 5, slot: 'head' }, // graduation cap
  { id: '1F451', kind: 'outfit', price: 8, slot: 'head' }, // crown
  { id: '1F33B', kind: 'decoration', price: 1 }, // sunflower
  { id: '1FAB4', kind: 'decoration', price: 2 }, // potted plant
  { id: '1FA81', kind: 'decoration', price: 2 }, // kite
  { id: '1F384', kind: 'decoration', price: 3 }, // fir with lights
  { id: '26F2', kind: 'decoration', price: 4 }, // fountain
  { id: '26FA', kind: 'decoration', price: 4 }, // tent
  { id: '1F3A0', kind: 'decoration', price: 6 }, // carousel horse
];

export const shopItem = (id: string) => SHOP.find((i) => i.id === id);

/** What Αγκαθούλης wears after putting on `id`: it replaces whatever was in the same place. */
export function wearing(current: readonly string[], id: string): string[] {
  const slot = shopItem(id)?.slot;
  return [...current.filter((w) => shopItem(w)?.slot !== slot), id];
}

/** Taking off (a second tap on what is worn). */
export const takingOff = (current: readonly string[], id: string) => current.filter((w) => w !== id);
