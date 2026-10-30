// Enforces CLAUDE.md rules on app source: no Greek text outside content/,
// no network calls. Test files are exempt (they need Greek fixtures).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcDir = join(import.meta.dirname);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const appFiles = sourceFiles(srcDir)
  .map((path) => ({ rel: relative(srcDir, path).split(sep).join('/'), text: readFileSync(path, 'utf8') }))
  .filter((f) => !f.rel.startsWith('content/'));

// Schema literals copied from PRD §8 (e.g. Word.article) are the only exception.
const GREEK_ALLOWED = new Set(['engine/types.ts']);
const GREEK =/[Ͱ-Ͽἀ-῿]/;
const NETWORK = /\b(fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon)|https?:\/\//;

describe('repo rules', () => {
  it('finds app source files', () => {
    expect(appFiles.length).toBeGreaterThan(0);
  });

  it.each(appFiles.filter((f) => !GREEK_ALLOWED.has(f.rel)))('$rel has no hardcoded Greek text', ({ text }) => {
    // Comments may use Greek examples; they never reach the screen.
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const line = code.split('\n').find((l) => GREEK.test(l));
    expect(line).toBeUndefined();
  });

  it.each(appFiles)('$rel makes no network calls', ({ text }) => {
    const line = text.split('\n').find((l) => NETWORK.test(l));
    expect(line).toBeUndefined();
  });
});
