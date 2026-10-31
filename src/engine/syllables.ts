// Open syllables (consonant + vowel, or a vowel alone) built from taught letters,
// for «Ποια συλλαβή ακούς;». Each is written with the first taught spelling of its
// vowel sound (ι before η, ο before ω), so two choices never sound the same.

/**
 * @param taught graphemes in teaching order
 * @param vowels every vowel grapheme (greek.json `vowels`)
 * @param syllableVowels the vowel sounds a syllable may end in (greek.json `syllableVowels`)
 */
export function cvSyllables(taught: readonly string[], vowels: readonly string[], soundOf: (g: string) => string, syllableVowels: readonly string[]): string[] {
  const isVowel = new Set(vowels);
  const spelling = new Map<string, string>();
  for (const g of taught) {
    const s = soundOf(g);
    if (!spelling.has(s)) spelling.set(s, g);
  }
  const vowelSpellings = syllableVowels.map((v) => spelling.get(v)).filter((v): v is string => v !== undefined);
  const consonants = [...spelling.entries()].filter(([, g]) => !isVowel.has(g)).map(([, g]) => g);
  return [...vowelSpellings, ...consonants.flatMap((c) => vowelSpellings.map((v) => c + v))];
}
