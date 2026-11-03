import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import type { AnswerLog } from '../../engine/types.ts';
import { itemText, summarize, unitOfText, WEEK_MS } from './progressStats.ts';

const NOW = 10 * WEEK_MS;
let n = 0;
const answer = (itemId: string, correct: boolean, extra: Partial<AnswerLog> = {}): AnswerLog => ({
  id: `a${++n}`,
  childId: 'c',
  ts: NOW - 1000,
  exerciseId: 'x',
  itemId,
  target: '',
  given: '',
  correct,
  attempt: 1,
  soundsRight: false,
  usedListen: false,
  latencyMs: 4000,
  position: 0,
  ...extra,
});

describe('unitOfText', () => {
  it('places material in the unit that makes it readable', () => {
    expect(unitOfText('πίτα', CONTENT)).toBe(1);
    expect(unitOfText('μήλο', CONTENT)).toBe(2);
    expect(unitOfText('γάτα', CONTENT)).toBe(3);
    expect(unitOfText('μπανάνα', CONTENT)).toBe(4);
    // «είναι» is a sight word from unit 1, so this sentence belongs to unit 2 (μ, λ)
    expect(unitOfText('Είναι ένα μήλο.', CONTENT)).toBe(2);
  });

  it('resolves every kind of item', () => {
    expect(itemText('word:pie', CONTENT)).toBe('πίτα');
    expect(itemText('grapheme:ω', CONTENT)).toBe('ω');
    expect(itemText('sentence:bird-yes', CONTENT)).toBe('Το πουλί πετά.');
    expect(itemText('story:cat-fish:1', CONTENT)).toContain('Ποιος έχει ψωμί;');
    expect(itemText('word:nope', CONTENT)).toBeNull();
  });
});

describe('summarize', () => {
  it('counts first attempts per unit over the last 7 days only', () => {
    const s = summarize(
      [
        answer('word:pie', true),
        answer('word:pie', false),
        answer('word:pie', true, { attempt: 2 }),
        answer('word:cat', false),
        answer('word:pie', false, { ts: NOW - WEEK_MS - 1 }),
      ],
      CONTENT,
      NOW,
    );
    expect(s.firstAttempts).toBe(3);
    expect(s.units).toEqual([
      { unitId: 1, firstAttempts: 2, correct: 1, ms: 12000 },
      { unitId: 3, firstAttempts: 1, correct: 0, ms: 4000 },
    ]);
  });

  it('lists the hardest letters and words, listens and Greek confusions', () => {
    const s = summarize(
      [
        answer('grapheme:ο', false, { target: 'ο', given: 'ω' }),
        answer('grapheme:ο', false, { target: 'ο', given: 'ω' }),
        answer('grapheme:π', false, { target: 'π', given: 'τ' }),
        answer('grapheme:π', true, { target: 'π', given: 'π' }),
        answer('word:pie', false, { target: 'pie', given: 'duck', usedListen: true }),
        answer('word:duck', true),
      ],
      CONTENT,
      NOW,
    );
    expect(s.letters.map((h) => [h.text, h.mistakes, h.tries])).toEqual([
      ['ο', 2, 2],
      ['π', 1, 2],
    ]);
    expect(s.words.map((h) => h.key)).toEqual(['word:pie']);
    expect(s.listened).toBe(1);
    expect(s.confusions).toEqual([
      { target: 'ο', given: 'ω', count: 2 },
      { target: 'π', given: 'τ', count: 1 },
    ]);
  });
});
