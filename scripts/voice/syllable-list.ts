// Prints {soundKey: text to say} for every syllable the app may play: the syllables
// of every bank word and listed name, plus each consonant sound of the curriculum before α ε ι ο ου
// and the vowels alone (for «Ποια συλλαβή ακούς;»). Feeds scripts/voice/generate.py.

import curriculum from '../../src/content/curriculum.json' with { type: 'json' };
import greek from '../../src/content/greek.json' with { type: 'json' };
import names from '../../src/content/names.json' with { type: 'json' };
import words from '../../src/content/words.json' with { type: 'json' };
import { soundOf, syllableSoundKey } from '../../src/engine/homophones.ts';
import { cvSyllables } from '../../src/engine/syllables.ts';

const out = new Map<string, string>();
const add = (text: string) => {
  const key = syllableSoundKey(text);
  if (!out.has(key)) out.set(key, text.normalize('NFC').toLocaleLowerCase('el'));
};
for (const s of cvSyllables(curriculum.units.flatMap((u) => u.graphemes), greek.vowels, soundOf, greek.syllableVowels)) add(s);
for (const w of [...words, ...names]) for (const s of w.syllables) add(s);
console.log(JSON.stringify(Object.fromEntries(out), null, 0));
