// A whole day as the child lives it, at each screen size: «Πάμε!», a letter coming
// back, the stations, three rounds with their first-time demos and breaks, the end of
// the day, the village, then the parent's gate and screen. Audio is silent (?fast).

import { expect, test, type Page } from '@playwright/test';
import { checkLayout, checkLetters, playStep, seeded, setUp, shot, watchErrors } from './robot.ts';

const POS = 27; // end of unit 3: most games are open
/** taps, strokes and waits allowed for the whole day before it counts as stuck */
const MAX_STEPS = 2500;

async function visible(page: Page, selector: string): Promise<boolean> {
  return page
    .locator(selector)
    .first()
    .isVisible()
    .catch(() => false);
}

test('a whole day, from «Πάμε!» to the parent screen', async ({ page }, info) => {
  const errors = watchErrors(page);
  await page.goto('./?fast');
  await setUp(page, { upToPosition: POS, dailyLimitMinutes: 600, seenDemos: [], enabledExercises: null }, { roundsPlayed: 3, lettersReturned: POS - 2 });

  // start
  await page.locator('.go').waitFor();
  await checkLayout(page, 'start');
  await checkLetters(page, POS, 'start');
  await shot(page, info, 'start');
  await page.locator('.go').click();

  // the letters taught since last time come back
  await page.locator('.letter-return').waitFor();
  await page.waitForTimeout(2500); // let them land
  await checkLayout(page, 'letters return');
  await checkLetters(page, POS, 'letters return');
  await shot(page, info, 'letters return');
  await page.locator('.letter-return .icon-button--primary').click();

  // home: the first station choice
  await page.locator('.stations').waitFor();
  await checkLayout(page, 'home');
  await checkLetters(page, POS, 'home');
  await shot(page, info, 'home');

  const rng = seeded(7);
  const seen = new Set<string>();
  let steps = 0;
  let rounds = 0;
  while (!(await visible(page, 'main.done')) && steps++ < MAX_STEPS) {
    if (await visible(page, '.stations')) {
      if (rounds > 0 && !seen.has('choice')) {
        seen.add('choice');
        await checkLayout(page, 'station choice');
        await shot(page, info, 'station choice');
      }
      const stations = page.locator('.stations .station');
      await stations.nth(Math.floor(rng() * (await stations.count()))).click();
      rounds++;
      seen.delete('round');
    } else if (await visible(page, '.break')) {
      if (!seen.has('break')) {
        seen.add('break');
        await checkLayout(page, 'break');
        await shot(page, info, 'break');
      }
      const tray = page.locator('.break .tray-item');
      if (await tray.count()) await tray.first().click();
      else await page.locator('.break .icon-button--primary').click();
    } else if (await visible(page, '.exercise-stage')) {
      if (!seen.has('round')) {
        seen.add('round');
        await page.waitForTimeout(300);
        const game = ((await page.locator('.exercise-stage').first().getAttribute('class')) ?? '').replace('exercise-stage', '').trim();
        const where = `round ${rounds}, ${game}${(await visible(page, '.demo-hand, .trace-hand')) ? ' (first-time demo)' : ''}`;
        await checkLayout(page, where);
        await checkLetters(page, POS, where);
        await shot(page, info, where);
      }
      if (!(await playStep(page, rng))) await page.waitForTimeout(150);
    } else {
      await page.waitForTimeout(200);
    }
  }
  expect(steps, 'the day reached its end').toBeLessThan(MAX_STEPS);
  expect(rounds, 'rounds played').toBe(3);

  // end of the day
  await page.waitForTimeout(1500);
  await checkLayout(page, 'end of the day');
  await shot(page, info, 'end of the day');

  // the village, with what was won and the letter board
  await page.locator('main.done .icon-button:not(.icon-button--primary)').click();
  await page.locator('.village').waitFor();
  await page.waitForTimeout(800);
  await checkLayout(page, 'village');
  await checkLetters(page, POS, 'village');
  await shot(page, info, 'village');

  // home, then the parent's gate and screen
  await page.locator('.village-bar .icon-button').first().click();
  await page.locator('.parent-lock').click();
  const question = await page.locator('label[for="gate-input"]').innerText();
  const [a, b] = (question.match(/\d+/g) ?? []).map(Number);
  await shot(page, info, 'parent gate');
  await page.locator('#gate-input').fill(String(a! * b!));
  await page.locator('.gate-card button[type="submit"]').click();
  await expect(page.locator('html.parent-mode')).toHaveCount(1);
  // not installed in the robot's browser: past the install card to the settings
  const install = page.locator('.parent-card.install button');
  if (await install.count()) await install.click();
  await page.waitForTimeout(800);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect.soft(wide, 'parent screen: wider than the screen by').toBeLessThanOrEqual(1);
  await shot(page, info, 'parent screen', true);

  expect(errors, 'errors on the page').toEqual([]);
});
