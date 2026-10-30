import type { AnswerLog, Round } from '../engine/types.ts';

/**
 * Builds an AnswerLog from inside an exercise. The session fills childId.
 * itemId doubles as the review-queue key: "word:<wordId>" or "grapheme:<g>".
 */
export function makeAnswer(
  round: Round,
  fields: Pick<AnswerLog, 'itemId' | 'target' | 'given' | 'correct' | 'attempt' | 'position'> &
    Partial<Pick<AnswerLog, 'soundsRight' | 'usedListen' | 'latencyMs'>>,
): AnswerLog {
  return {
    id: crypto.randomUUID(),
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

export function wordIdOf(itemId: string): string | null {
  return itemId.startsWith('word:') ? itemId.slice(5) : null;
}
