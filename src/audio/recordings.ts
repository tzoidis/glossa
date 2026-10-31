// What must be recorded (PRD §6): instructions and praise are never TTS.
// Letter sounds are no longer required: the sound games play syllables, and
// syllable clips ship in the app (src/audio/files/syllable/). Syllables are keyed
// by sound, so «τή», «τι» and «τυ» share one clip.

import audio from '../content/audio.json' with { type: 'json' };
import { normalizeText } from '../engine/greekTokenizer.ts';
import { soundOf, syllableSoundKey } from '../engine/homophones.ts';

export type AudioKind = 'phoneme' | 'instruction' | 'praise' | 'syllable' | 'word' | 'sentence';

/** Kinds that may fall back to the local TTS voice. */
export const TTS_KINDS: ReadonlySet<AudioKind> = new Set(['syllable', 'word', 'sentence']);

export function audioKey(kind: AudioKind, key: string): string {
  return `${kind}/${kind === 'syllable' ? syllableSoundKey(key) : normalizeText(key)}`;
}

export interface RequiredRecording {
  key: string;
  kind: AudioKind;
  /** what the parent says: the grapheme for phonemes, the sentence otherwise */
  text: string;
}

export function phonemeKey(grapheme: string): string {
  return audioKey('phoneme', soundOf(grapheme));
}

export function requiredRecordings(): RequiredRecording[] {
  return [
    ...Object.entries(audio.instructions).map(([id, text]) => ({ key: audioKey('instruction', id), kind: 'instruction' as const, text })),
    ...audio.praise.map((text, i) => ({ key: audioKey('praise', String(i + 1)), kind: 'praise' as const, text })),
  ];
}

export function praiseKeys(): string[] {
  return audio.praise.map((_, i) => String(i + 1));
}
