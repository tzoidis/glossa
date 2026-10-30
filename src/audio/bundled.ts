// Recordings shipped inside the app (PRD §6): src/audio/files/<kind>/<key>.<ext>,
// e.g. files/phoneme/σ.m4a or files/instruction/welcome.mp3. Vite hashes them and
// the service worker precaches them, so they work offline and are never lost.

import { normalizeText } from '../engine/greekTokenizer.ts';

const files = import.meta.glob('./files/**/*.{mp3,m4a,aac,ogg,webm,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const BY_KEY = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  // NFC: macOS stores file names decomposed
  const key = normalizeText(path.replace(/^\.\/files\//, '').replace(/\.[^.]+$/, ''));
  BY_KEY.set(key, url);
}

export function bundledUrl(key: string): string | undefined {
  return BY_KEY.get(normalizeText(key));
}

export function bundledKeys(): string[] {
  return [...BY_KEY.keys()];
}
