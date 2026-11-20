import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { CONTENT } from '../app/content.ts';
import { ensureChild, openDb, type GlossaDb } from '../storage/db.ts';
import { buyShopItem, setWearing } from '../storage/progress.ts';
import { DEFAULT_CHILD_ID } from '../storage/schema.ts';
import { SHOP, shopItem, takingOff, wearing } from './shop.ts';
import { freeSpot, randomSpotIn, zoneOf } from './zones.ts';
import { pictureUrl } from '../ui/Picture.tsx';

describe('village zones', () => {
  it('puts water animals in the pond, flyers in the sky, house things in the garden', () => {
    const word = (id: string) => CONTENT.wordsById.get(id)!;
    expect(zoneOf(word('fish'))).toBe('pond');
    expect(zoneOf(word('eagle'))).toBe('sky');
    expect(zoneOf(word('spoon'))).toBe('garden');
    expect(zoneOf(word('ball'))).toBe('meadow');
    expect(zoneOf(undefined)).toBe('meadow');
  });

  it('lists only words of the bank', () => {
    for (const id of ['fish', 'duck', 'eagle', 'bee', 'boat']) expect(CONTENT.wordsById.has(id), id).toBe(true);
  });

  it('keeps every spot inside the scene and away from what is there', () => {
    for (const zone of ['pond', 'sky', 'garden', 'meadow'] as const) {
      for (let k = 0; k < 50; k++) {
        const s = randomSpotIn(zone);
        expect(s.x).toBeGreaterThan(0);
        expect(s.x).toBeLessThan(100);
        expect(s.y).toBeGreaterThan(0);
        expect(s.y).toBeLessThan(100);
      }
    }
    const candidates = [
      { x: 50, y: 70 },
      { x: 90, y: 88 },
    ];
    let k = 0;
    expect(freeSpot([{ x: 50, y: 70 }], () => candidates[k++ % 2]!, 2)).toEqual({ x: 90, y: 88 });
  });
});

describe('star shop', () => {
  it('has a bundled picture for everything it sells', () => {
    for (const item of SHOP) expect(pictureUrl(item.id), item.id).toBeDefined();
    for (const item of SHOP) expect(item.kind === 'outfit' ? item.slot : 'none').toBeDefined();
  });

  it('wears one outfit per place', () => {
    const ribbon = '1F380';
    const hat = '1F3A9';
    const glasses = '1F576';
    expect(shopItem(ribbon)?.slot).toBe('head');
    expect(wearing([ribbon, glasses], hat)).toEqual([glasses, hat]);
    expect(takingOff([glasses, hat], hat)).toEqual([glasses]);
  });

  const dbs: GlossaDb[] = [];
  afterEach(() => dbs.splice(0).forEach((d) => d.close()));

  it('spends stars, once per outfit, never below zero', async () => {
    const db = await openDb({ name: 'shop-1', backupsName: 'shop-backups-1' });
    dbs.push(db);
    await ensureChild(db, 9);
    await db.children.update(DEFAULT_CHILD_ID, { stars: 5 });
    const hat = shopItem('1F3A9')!;
    const flower = shopItem('1F33B')!;
    const crown = shopItem('1F451')!;

    expect(await buyShopItem(db, DEFAULT_CHILD_ID, hat, (w) => wearing(w, hat.id), 1)).toBe(true);
    expect(await buyShopItem(db, DEFAULT_CHILD_ID, hat, (w) => wearing(w, hat.id), 2)).toBe(false); // owned
    expect(await buyShopItem(db, DEFAULT_CHILD_ID, crown, (w) => wearing(w, crown.id), 3)).toBe(false); // too dear
    expect(await buyShopItem(db, DEFAULT_CHILD_ID, flower, (w) => w, 4)).toBe(true);
    expect(await buyShopItem(db, DEFAULT_CHILD_ID, flower, (w) => w, 5)).toBe(false); // no stars left

    const child = (await db.children.get(DEFAULT_CHILD_ID))!;
    expect(child.stars).toBe(0);
    expect(child.wearing).toEqual([hat.id]);
    const world = await db.world.toArray();
    expect(world.map((w) => w.kind).sort()).toEqual(['decoration', 'outfit']);
    expect(world.every((w) => w.x === null)).toBe(true);

    await setWearing(db, DEFAULT_CHILD_ID, []);
    expect((await db.children.get(DEFAULT_CHILD_ID))!.wearing).toEqual([]);
  });
});
