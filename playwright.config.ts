// The robot player (e2e/): plays every game and walks every screen on the local dev
// server, in the Edge already on this computer. Local only: not part of CI, nothing
// is uploaded. `npm run play-all`, then `npm run play-report` to see the screenshots.
// PLAY=full plays every letter stage and level at every size (slow); the default is a
// quicker sweep (see e2e/games.spec.ts).

import { defineConfig } from '@playwright/test';

const PORT = 5199;

export default defineConfig({
  testDir: 'e2e',
  timeout: 15 * 60_000,
  workers: 2,
  reporter: [['html', { outputFolder: 'play-report', open: 'never' }], ['list']],
  outputDir: 'test-results',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    channel: 'msedge',
    headless: true,
    hasTouch: true,
    // the stations bob forever: with motion on, a tap never finds them still
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'phone-upright', use: { viewport: { width: 375, height: 667 } } },
    { name: 'phone-sideways', use: { viewport: { width: 667, height: 375 } } },
    { name: 'tablet-upright', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'tablet-sideways', use: { viewport: { width: 1024, height: 768 } } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
