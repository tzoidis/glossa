// What must be recorded (PRD §6): phonemes, instructions and praise are never TTS.
// Phonemes are recorded once per sound, so ο and ω share one recording.

import audio from '../content/audio.json' with { type: 'json' };
import { normalizeText } from '../engine/greekTokenizer.ts';
import { soundOf } from '../engine/homophones.ts';
import type { Curriculum } from '../engine/types.ts';

export type AudioKind = 'phoneme' | 'instruction' | 'praise' | 'syllable' | 'word' | 'sentence';

/** Kinds that may fall back to the local TTS voice. */
export const TTS_KINDS: ReadonlySet<AudioKind> = new Set(['syllable', 'word', 'sentence']);

export function audioKey(kind: AudioKind, key: string): string {
  return `${kind}/${normalizeText(key)}`;
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

export function requiredRecordings(curriculum: Curriculum): RequiredRecording[] {
  const phonemes = new Map<string, RequiredRecording>();
  for (const g of curriculum.units.flatMap((u) => u.graphemes)) {
    const key = phonemeKey(g);
    if (!phonemes.has(key)) phonemes.set(key, { key, kind: 'phoneme', text: soundOf(g) });
  }
  return [
    ...phonemes.values(),
    ...Object.entries(audio.instructions).map(([id, text]) => ({ key: audioKey('instruction', id), kind: 'instruction' as const, text })),
    ...audio.praise.map((text, i) => ({ key: audioKey('praise', String(i + 1)), kind: 'praise' as const, text })),
  ];
}

export function praiseKeys(): string[] {
  return audio.praise.map((_, i) => String(i + 1));
}
