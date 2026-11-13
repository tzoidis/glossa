// Copies into src/assets/openmoji/ only the OpenMoji pictures the app shows (PRD §8):
// every word's imageId in words.json, the sentence pictures in sentences.json, the
// story question pictures in stories.json,
// plus the picture codes written in app code
// (station icons, the clap). Unchanged colour SVGs from the tagged release, so the
// CC BY-SA 4.0 credit on the parent screen is all the licence asks.
//
//   node scripts/build-openmoji-subset.ts          # fetch what is missing
//   node scripts/build-openmoji-subset.ts --prune  # also delete pictures no longer used
//
// Runs on the PC with network, never in the app. Run it after adding a word.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sentences from '../src/content/sentences.json' with { type: 'json' };
import stories from '../src/content/stories.json' with { type: 'json' };
import words from '../src/content/words.json' with { type: 'json' };

const RELEASE = '17.0.0';
const SOURCE = `https://raw.githubusercontent.com/hfg-gmuend/openmoji/${RELEASE}/color/svg`;
const root = join(import.meta.dirname, '..');
const outDir = join(root, 'src', 'assets', 'openmoji');

/** picture codes written as string literals in app code, e.g. icon: '1F50D' */
function codesInSource(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return codesInSource(path);
    if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) return [];
    const literals = readFileSync(path, 'utf8').matchAll(/'([0-9A-F]{4,5}(?:-[0-9A-F]{4,5})*)'/g);
    // emoji start at U+2000; below are other hex-looking strings (PINs in tests, ids)
    return [...literals].map((m) => m[1]!).filter((code) => parseInt(code.split('-')[0]!, 16) >= 0x2000);
  });
}

const fromWords = new Set([
  ...words.map((w) => w.imageId).filter((id): id is string => Boolean(id)),
  ...sentences.map((s) => s.imageId).filter((id): id is string => Boolean(id)),
  ...stories.flatMap((s) => s.questions.flatMap((q) => q.imageChoices)),
]);
const wanted = new Set([...fromWords, ...codesInSource(join(root, 'src'))]);
mkdirSync(outDir, { recursive: true });

const missing: string[] = [];
for (const code of [...wanted].sort()) {
  const file = join(outDir, `${code}.svg`);
  if (existsSync(file)) continue;
  // OpenMoji names some sequences without the trailing variation selector
  const names = [code, code.replace(/-FE0F$/, '')];
  let svg: string | null = null;
  for (const name of new Set(names)) {
    const res = await fetch(`${SOURCE}/${name}.svg`);
    if (res.ok) {
      svg = await res.text();
      break;
    }
  }
  if (svg === null) {
    missing.push(code);
    continue;
  }
  writeFileSync(file, svg);
  console.log(`added ${code}`);
}

if (process.argv.includes('--prune')) {
  for (const name of readdirSync(outDir)) {
    if (name.endsWith('.svg') && !wanted.has(name.slice(0, -4))) {
      unlinkSync(join(outDir, name));
      console.log(`removed ${name}`);
    }
  }
}

const unknownWords = missing.filter((c) => fromWords.has(c));
console.log(`${wanted.size} pictures wanted, ${missing.length} not in OpenMoji ${RELEASE}${missing.length ? `: ${missing.join(' ')}` : ''}`);
if (unknownWords.length) process.exit(1);
