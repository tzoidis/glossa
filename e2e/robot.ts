// What the robot player does on a page: tap like a child (sometimes wrong, then the
// glowing answer), trace letters along their guide, and check what a parent would
// notice: errors, a game that never ends, something off the screen, a button too small
// for a finger, a letter the child has not learned yet.

import { expect, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

interface Unit {
  id: number;
  graphemes: string[];
  sightWords: string[];
}
const curriculum = JSON.parse(readFileSync(new URL('../src/content/curriculum.json', import.meta.url), 'utf8')) as { units: Unit[] };
export const ORDER = curriculum.units.flatMap((u) => u.graphemes);
/** every letter taught, and every thematic unit reached */
export const MAX_POSITION = ORDER.length + curriculum.units.filter((u) => u.id > 0 && u.graphemes.length === 0).length;

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ς/g, 'σ');

/** Letters of the book not yet taught at `pos` that appear in `text` (sight words of the units reached are read whole). */
export function unlearnedLetters(text: string, pos: number): string[] {
  const taught = new Set(ORDER.slice(0, pos).flatMap((g) => [...plain(g)]));
  let reached = 0;
  const sight: string[] = [];
  for (const u of curriculum.units) {
    if (u.graphemes.length > 0 && reached >= pos) break;
    reached += u.graphemes.length;
    sight.push(...u.sightWords);
  }
  let rest = plain(text);
  for (const w of sight) rest = rest.replace(new RegExp(`(^|[^\\p{L}])${plain(w)}(?=[^\\p{L}]|$)`, 'gu'), '$1');
  const greek = [...rest].filter((c) => /[Ͱ-Ͽ]/.test(c));
  return [...new Set(greek.filter((c) => !taught.has(c)))];
}

/** Errors from the page, collected for the whole test. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  return errors;
}

/** Layout checks a parent would notice; soft, so the robot carries on and lists them all. */
export async function checkLayout(page: Page, where: string): Promise<void> {
  const found = await page.evaluate(() => {
    const de = document.documentElement;
    const issues: string[] = [];
    if (de.scrollWidth > innerWidth + 1) issues.push(`wider than the screen: ${de.scrollWidth} > ${innerWidth}`);
    if (de.scrollHeight > innerHeight + 1) issues.push(`taller than the screen: ${de.scrollHeight} > ${innerHeight}`);
    const small = [...document.querySelectorAll('button')]
      .filter((b) => !document.documentElement.classList.contains('parent-mode') && !b.closest('.parent-gate, .dev-try-list'))
      .map((b) => b.getBoundingClientRect())
      .filter((r) => r.width > 0 && (r.width < 43.5 || r.height < 43.5))
      .map((r) => `${Math.round(r.width)}x${Math.round(r.height)}`);
    if (small.length) issues.push(`buttons under 44px: ${[...new Set(small)].join(', ')}`);
    return issues;
  });
  expect.soft(found, `${where}: layout`).toEqual([]);
}

export async function checkLetters(page: Page, pos: number, where: string): Promise<void> {
  const text = await page.locator('main').first().innerText();
  expect.soft(unlearnedLetters(text, pos), `${where}: letters not learned at position ${pos} on screen`).toEqual([]);
}

/** A screenshot in the report, and as a file under play-shots/<screen size>/ to browse. */
export async function shot(page: Page, info: TestInfo, name: string, fullPage = false): Promise<void> {
  const body = await page.screenshot({ fullPage });
  await info.attach(name, { body, contentType: 'image/png' });
  const dir = new URL(`../play-shots/${info.project.name}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL(`${name.replace(/[^\p{L}\p{N}=,() -]+/gu, '_')}.png`, dir), body);
}

/** Draws the next stroke of the tracing game along its guide, like a finger. */
async function traceNext(page: Page): Promise<boolean> {
  const points = await page.evaluate(() => {
    const pad = document.querySelector<SVGSVGElement>('.trace-pad');
    if (!pad) return null;
    const done = pad.querySelectorAll('.trace-done').length;
    const guide = pad.querySelectorAll<SVGPathElement>('.trace-guide')[done];
    const ctm = pad.getScreenCTM();
    if (!guide || !ctm) return null;
    const len = guide.getTotalLength();
    return Array.from({ length: 24 }, (_, k) => {
      const p = guide.getPointAtLength((len * k) / 23);
      return { x: ctm.a * p.x + ctm.e, y: ctm.d * p.y + ctm.f };
    });
  });
  if (!points) return false;
  await page.mouse.move(points[0]!.x, points[0]!.y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 2 });
  await page.mouse.up();
  return true;
}

/** The memory cards seen so far, by position, like a child remembers them; reset for each new grid. */
const remembered = new WeakMap<Page, { count: number; matched: number; texts: Map<number, string> }>();

/** The memory game: turn a card whose partner was seen if one is open, else a card not seen yet. */
async function memoryStep(page: Page, rng: () => number): Promise<boolean> {
  const cards = page.locator('.memory-card');
  const state = await cards.evaluateAll((els) =>
    els.map((e) => ({ up: e.classList.contains('face-up'), matched: e.classList.contains('matched'), text: e.textContent ?? '' })),
  );
  // a new grid (next question): fewer matched than before, or another number of cards
  const matchedNow = state.filter((c) => c.matched).length;
  let mem = remembered.get(page);
  if (!mem || mem.count !== state.length || matchedNow < mem.matched) remembered.set(page, (mem = { count: state.length, matched: matchedNow, texts: new Map() }));
  mem.matched = matchedNow;
  state.forEach((c, i) => c.up && !c.matched && mem!.texts.set(i, c.text));
  const open = state.map((c, i) => (c.up && !c.matched ? i : -1)).filter((i) => i >= 0);
  if (open.length >= 2) {
    await page.waitForTimeout(250); // they turn back on their own
    return true;
  }
  const same = (a: string, b: string) => plain(a) === plain(b);
  let pick = -1;
  if (open.length === 1) {
    const text = state[open[0]!]!.text;
    pick = [...mem.texts].find(([i, s]) => i !== open[0] && !state[i]!.matched && same(s, text))?.[0] ?? -1;
  } else {
    // a pair already known, else turn one not seen
    for (const [i, s] of mem.texts) {
      if (state[i]!.matched) continue;
      if ([...mem.texts].some(([j, o]) => j !== i && !state[j]!.matched && same(o, s))) {
        pick = i;
        break;
      }
    }
  }
  if (pick < 0) {
    const unseen = state.map((c, i) => (!c.up && !c.matched && !mem!.texts.has(i) ? i : -1)).filter((i) => i >= 0 && i !== open[0]);
    const any = state.map((c, i) => (!c.up && !c.matched ? i : -1)).filter((i) => i >= 0);
    const from = unseen.length ? unseen : any;
    if (!from.length) return false;
    pick = from[Math.floor(rng() * from.length)]!;
  }
  await cards
    .nth(pick)
    .click({ timeout: 2000 })
    .catch(() => {});
  return true;
}

/**
 * One tap or stroke in whatever game is on screen: usually the glowing answer if there
 * is one, otherwise any piece still in play (so wrong answers happen too). False when
 * there is nothing to tap.
 */
export async function playStep(page: Page, rng: () => number): Promise<boolean> {
  if (await page.locator('.trace-pad').count()) return traceNext(page);
  if (await page.locator('.memory-grid').count()) return memoryStep(page, rng);
  const stage = page.locator('.exercise-stage').first();
  const hint = stage.locator('button.hint:not([disabled])');
  if ((await hint.count()) && rng() < 0.8) {
    await hint.first().click({ timeout: 2000 }).catch(() => {});
    return true;
  }
  const pieces = stage.locator('button:not([disabled]):not(.icon-button):not(.faded):not(.matched):not(.key--erase)');
  const n = await pieces.count();
  if (n === 0) return false;
  await pieces
    .nth(Math.floor(rng() * n))
    .click({ timeout: 2000 })
    .catch(() => {});
  return true;
}

export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Writes settings and child fields straight into the app's database, then reloads. */
export async function setUp(page: Page, settings: Record<string, unknown>, child: Record<string, unknown> = {}): Promise<void> {
  await page.locator('main').first().waitFor();
  await page.evaluate(
    async ({ settings, child }) => {
      const registry = '/src/exercises/registry.ts';
      const ids = ((await import(/* @vite-ignore */ registry)) as { EXERCISES: { module: { id: string } }[] }).EXERCISES.map((e) => e.module.id);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open('glossa');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const tx = db.transaction(['settings', 'children'], 'readwrite');
      const first = (name: string) =>
        new Promise<Record<string, unknown>>((resolve) => {
          const q = tx.objectStore(name).getAll();
          q.onsuccess = () => resolve(q.result[0]);
        });
      const s = await first('settings');
      const c = await first('children');
      tx.objectStore('settings').put({ ...s, knownExercises: ids, ...settings });
      tx.objectStore('children').put({ ...c, ...child });
      await new Promise((r) => (tx.oncomplete = r));
      db.close();
    },
    { settings, child },
  );
  await page.reload();
}
