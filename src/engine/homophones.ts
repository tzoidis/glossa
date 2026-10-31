// Homophone rule, PRD §4: in exercises that start from a sound, wrong choices
// must never sound like the right one (/ο/ = ο, ω; /ι/ = ι, η, υ, ει, οι; /ε/ = ε, αι).

import greek from '../content/greek.json' with { type: 'json' };
import { graphemes } from './greekTokenizer.ts';

const SOUND_OF = new Map<string, string>();
for (const group of greek.homophones) for (const g of group) SOUND_OF.set(g, group[0]!);

/** Canonical sound for a grapheme: its homophone group's first member, or itself. */
export function soundOf(grapheme: string): string {
  return SOUND_OF.get(grapheme) ?? grapheme;
}

export function soundsSame(a: string, b: string): boolean {
  return soundOf(a) === soundOf(b);
}

/** Two words sound the same if their graphemes sound the same one by one (πόδι / πώδι). */
export function wordsSoundSame(a: string, b: string): boolean {
  const ga = graphemes(a);
  const gb = graphemes(b);
  return ga.length === gb.length && ga.every((g, i) => soundsSame(g, gb[i]!));
}

/**
 * One key per spoken syllable: accents dropped, each grapheme replaced by its sound
 * («τή», «τι» and «τυ» → «τι»; «νάς» → «νασ»). Syllable clips are stored under it.
 */
export function syllableSoundKey(syllable: string): string {
  return graphemes(syllable).map(soundOf).join('');
}

/** Drops candidates that sound like the target or like an earlier kept candidate. */
export function distinctSounds(target: string, candidates: string[]): string[] {
  const seen = new Set([soundOf(target)]);
  return candidates.filter((c) => {
    const s = soundOf(c);
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });
}
