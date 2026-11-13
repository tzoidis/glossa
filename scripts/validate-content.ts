// Validates everything in src/content/. Run with `npm run validate-content`.
// Generic: every JSON file parses and every string is NFC.
// Specific (src/engine/contentValidation.ts): curriculum, words, sentences, stories, capacity.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateContent, type CapacityConfig, type Content } from '../src/engine/contentValidation.ts';

const contentDir = join(import.meta.dirname, '..', 'src', 'content');
const errors: string[] = [];

function walkStrings(value: unknown, path: string, visit: (s: string, path: string) => void): void {
  if (typeof value === 'string') {
    visit(value, path);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(v, `${path}[${i}]`, visit));
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      walkStrings(k, `${path} (key)`, visit);
      walkStrings(v, `${path}.${k}`, visit);
    }
  }
}

const files = new Map<string, unknown>();
for (const file of readdirSync(contentDir).filter((f) => f.endsWith('.json'))) {
  try {
    files.set(file, JSON.parse(readFileSync(join(contentDir, file), 'utf8')));
  } catch (e) {
    errors.push(`${file}: invalid JSON (${(e as Error).message})`);
  }
}
for (const [file, data] of files) {
  walkStrings(data, file, (s, path) => {
    if (s !== s.normalize('NFC')) errors.push(`${path}: not NFC: ${JSON.stringify(s)}`);
  });
}

const load = <T>(file: string, fallback: T): T =>
  existsSync(join(contentDir, file)) ? ((files.get(file) as T | undefined) ?? fallback) : fallback;

const content: Content = {
  curriculum: load('curriculum.json', { book: '', units: [] }),
  words: load('words.json', []),
  sentences: load('sentences.json', []),
  stories: load('stories.json', []),
  names: load('names.json', []),
};
const capacity = load<CapacityConfig>('capacity.json', { minWords: 0, minChoices: 0, checkpoints: [], exercises: {} });

const result = validateContent(content, capacity);
errors.push(...result.errors);

// Capacity report: how many items each exercise can draw from at each unit end.
const ids = Object.keys(capacity.exercises);
console.log(`words: ${content.words.length}, names: ${content.names?.length ?? 0}, sentences: ${content.sentences.length}, stories: ${content.stories.length}`);
console.log(['position', ...ids].join('\t'));
for (const row of result.capacity) {
  console.log([`${row.position} ${row.label}`, ...ids.map((id) => row.counts[id] ?? '-')].join('\t'));
}

if (errors.length > 0) {
  console.error(`validate-content: ${errors.length} error(s)`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log('validate-content: OK');
