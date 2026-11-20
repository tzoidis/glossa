// Every game, played to the end like a child would, through the dev-only try page.
// Default: the hardest case (every letter, level 3) at every screen size, plus the
// start and middle of the year on the sideways tablet. PLAY=full: every stage × level
// at every size.

import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { checkLayout, checkLetters, MAX_POSITION, playStep, seeded, shot, watchErrors } from './robot.ts';

// the game ids, read from the registry's imports (one folder per game)
const registry = readFileSync(new URL('../src/exercises/registry.ts', import.meta.url), 'utf8');
const GAMES = [...registry.matchAll(/^import \{ (\w+) \} from '\.\/(\w+)\/index\.ts';/gm)].map((m) => m[2]!.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));

const END_OF_UNIT_1 = 9;
const END_OF_UNIT_3 = 27;
const full = process.env.PLAY === 'full';
/** taps and strokes allowed for one round before it counts as stuck */
const MAX_STEPS = 400; // random typing in the dictation takes ~40 taps a word

function cases(project: string): { pos: number; level: number }[] {
  if (full) return [END_OF_UNIT_1, 18, END_OF_UNIT_3, MAX_POSITION].flatMap((pos) => [1, 2, 3].map((level) => ({ pos, level })));
  const hardest = [{ pos: MAX_POSITION, level: 3 }];
  return project === 'tablet-sideways' ? [{ pos: END_OF_UNIT_1, level: 1 }, { pos: END_OF_UNIT_3, level: 2 }, ...hardest] : hardest;
}

test('the game list matches the registry', () => {
  expect(GAMES.length).toBeGreaterThan(20);
});

for (const game of GAMES) {
  test(`plays ${game}`, async ({ page }, info) => {
    const errors = watchErrors(page);
    for (const { pos, level } of cases(info.project.name)) {
      const where = `${game} pos=${pos} level=${level}`;
      await page.goto(`./?try=${game}&pos=${pos}&level=${level}&seed=1&fast`);
      const stage = page.locator('.exercise-stage');
      const label = page.locator('.dev-try-seed');
      await expect(stage.or(page.getByText(/not enough content|not offered yet/))).toBeVisible({ timeout: 30_000 });
      if (!(await stage.count())) {
        info.annotations.push({ type: 'skipped', description: `${where}: ${await page.locator('main').innerText()}` });
        continue;
      }
      await checkLayout(page, where);
      await checkLetters(page, pos, where);
      await shot(page, info, `${where} start`);

      const rng = seeded(pos * 10 + level);
      let steps = 0;
      let lettersChecked = 0;
      while ((await label.innerText()).includes('seed=1') && steps < MAX_STEPS) {
        if (!(await playStep(page, rng))) await page.waitForTimeout(150);
        steps++;
        if (steps % 20 === 0 && lettersChecked++ < 5) await checkLetters(page, pos, where);
        if (steps === 6) await shot(page, info, `${where} playing`);
      }
      expect.soft(steps, `${where}: the round ended`).toBeLessThan(MAX_STEPS);
      info.annotations.push({ type: 'round', description: `${where}: ${steps} taps` });
    }
    expect(errors, 'errors on the page').toEqual([]);
  });

  test(`first-time demo of ${game}`, async ({ page }, info) => {
    const errors = watchErrors(page);
    const pos = MAX_POSITION;
    await page.goto(`./?try=${game}&pos=${pos}&level=1&seed=1&fast&demo`);
    await page.locator('.exercise-stage').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(500);
    await checkLayout(page, `${game} demo`);
    await shot(page, info, `${game} demo`);
    expect(errors, 'errors on the page').toEqual([]);
  });
}
