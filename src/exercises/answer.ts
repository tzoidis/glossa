import type { AnswerLog, Round } from '../engine/types.ts';

/** randomUUID exists only in secure contexts; the tablet may load the dev server over plain http on the LAN. */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Builds an AnswerLog from inside an exercise. The session fills childId.
 * itemId doubles as the review-queue key: "word:<wordId>", "grapheme:<g>", "syllable:<s>", "sentence:<id>" or "story:<id>:<question>".
 */
export function makeAnswer(
  round: Round,
  fields: Pick<AnswerLog, 'itemId' | 'target' | 'given' | 'correct' | 'attempt' | 'position'> &
    Partial<Pick<AnswerLog, 'soundsRight' | 'usedListen' | 'latencyMs'>>,
): AnswerLog {
  return {
    id: newId(),
    childId: '',
    ts: Date.now(),
    exerciseId: round.exerciseId,
    soundsRight: false,
    usedListen: false,
    latencyMs: 0,
    ...fields,
  };
}

export const wordItemId = (wordId: string) => `word:${wordId}`;
export const graphemeItemId = (g: string) => `grapheme:${g}`;
/** tracing and memory have their own keys: a shaky stroke or a forgotten card is not a reading error */
export const traceItemId = (letter: string) => `trace:${letter}`;
export const caseItemId = (g: string) => `case:${g}`;
export const syllableItemId = (s: string) => `syllable:${s}`;
export const sentenceItemId = (id: string) => `sentence:${id}`;
export const storyItemId = (id: string, question: number) => `story:${id}:${question}`;

export function wordIdOf(itemId: string): string | null {
  return itemId.startsWith('word:') ? itemId.slice(5) : null;
}
