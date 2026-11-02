import { describe, expect, it } from 'vitest';
import audio from '../content/audio.json' with { type: 'json' };
import sentences from '../content/sentences.json' with { type: 'json' };
import words from '../content/words.json' with { type: 'json' };
import { bundledUrl } from './bundled.ts';
import { audioKey } from './recordings.ts';

// The games say these without the device voice: a word added to the bank needs
// its clip (python scripts/voice/generate.py --words --only <id>).
describe('bundled clips', () => {
  it('every instruction and praise', () => {
    const missing = [
      ...Object.keys(audio.instructions).map((k) => audioKey('instruction', k)),
      ...audio.praise.map((_, i) => audioKey('praise', String(i + 1))),
    ].filter((k) => !bundledUrl(k));
    expect(missing).toEqual([]);
  });

  it('every bank word', () => {
    expect(words.map((w) => audioKey('word', w.id)).filter((k) => !bundledUrl(k))).toEqual([]);
  });

  it('every sentence', () => {
    expect(sentences.map((s) => audioKey('sentence', s.id)).filter((k) => !bundledUrl(k))).toEqual([]);
  });

  it('every syllable of a bank word', () => {
    const keys = new Set(words.flatMap((w) => w.syllables.map((s) => audioKey('syllable', s))));
    expect([...keys].filter((k) => !bundledUrl(k))).toEqual([]);
  });
});
