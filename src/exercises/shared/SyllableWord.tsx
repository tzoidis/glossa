// Feedback that shows how a word is decoded (pedagogy review): after a mistake the
// written word is heard syllable by syllable, each syllable lighting up as it
// plays, then the whole word slowly. The syllable clips are bundled already.

import { useCallback, useState } from 'react';
import type { Word } from '../../engine/types.ts';
import { useRoundAudio } from './useRoundAudio.ts';

/** The word as written, one span per syllable; `lit` marks the one being heard. */
export function SyllableWord({ word, lit, before }: { word: Pick<Word, 'syllables' | 'text'>; lit: number | null; before?: React.ReactNode }) {
  // the syllables spell the word, accents included; fall back to the plain word if not
  const parts = word.syllables.join('') === word.text ? word.syllables : [word.text];
  return (
    <span className="reading-word">
      {before}
      {parts.map((s, k) => (
        <span key={k} className={`syl ${k === lit ? 'syl--lit' : ''}`}>
          {s}
        </span>
      ))}
    </span>
  );
}

/** Plays a word syllable by syllable (lighting each), then whole and slow. */
export function useSyllableReplay() {
  const audio = useRoundAudio();
  const [lit, setLit] = useState<number | null>(null);
  const replay = useCallback(
    async (word: Pick<Word, 'id' | 'syllables' | 'text'>) => {
      const run = audio.sequence();
      for (let k = 0; k < word.syllables.length; k++) {
        if (!run.alive()) break;
        setLit(k);
        await audio.syllable(word.syllables[k]!, true);
      }
      setLit(null);
      if (run.alive()) await audio.word(word.id, word.text, true);
    },
    [audio],
  );
  return { lit, replay };
}
