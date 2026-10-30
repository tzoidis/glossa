// Validates everything in src/content/. Run with `npm run validate-content`.
// M0: every file parses and every string is NFC-normalized.
// M1 adds: tokenizer-derived graphemes/minPosition, flags, syllables, images, capacity.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

for (const file of readdirSync(contentDir).filter((f) => f.endsWith('.json'))) {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(join(contentDir, file), 'utf8'));
  } catch (e) {
    errors.push(`${file}: invalid JSON (${(e as Error).message})`);
    continue;
  }
  walkStrings(data, file, (s, path) => {
    if (s !== s.normalize('NFC')) errors.push(`${path}: not NFC: ${JSON.stringify(s)}`);
  });
}

if (errors.length > 0) {
  console.error(`validate-content: ${errors.length} error(s)`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log('validate-content: OK');
