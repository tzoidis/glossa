import { describe, expect, it } from 'vitest';
import { firstAttemptShare, nextLevel, readyForNextLetter } from './adaptive.ts';

const a = (correct: boolean, attempt: 1 | 2 = 1) => ({ correct, attempt });

describe('firstAttemptShare', () => {
  it('counts only first attempts', () => {
    expect(firstAttemptShare([a(false), a(true, 2), a(true), a(true), a(true)])).toBe(0.75);
    expect(firstAttemptShare([])).toBeNull();
  });
});

describe('nextLevel', () => {
  it('goes up after two good rounds in a row', () => {
    const one = nextLevel(undefined, 1);
    expect(one).toEqual({ level: 1, goodRounds: 1 });
    expect(nextLevel(one, 0.9)).toEqual({ level: 2, goodRounds: 0 });
  });

  it('needs the two good rounds in a row', () => {
    const one = nextLevel(undefined, 1);
    const middling = nextLevel(one, 0.8); // 4 of 5 is below 85%
    expect(middling).toEqual({ level: 1, goodRounds: 0 });
    expect(nextLevel(middling, 1)).toEqual({ level: 1, goodRounds: 1 });
  });

  it('goes down after a round below half, never under 1', () => {
    expect(nextLevel({ level: 3, goodRounds: 1 }, 0.4)).toEqual({ level: 2, goodRounds: 0 });
    expect(nextLevel({ level: 2, goodRounds: 0 }, 0.5)).toEqual({ level: 2, goodRounds: 0 });
    expect(nextLevel(undefined, 0)).toEqual({ level: 1, goodRounds: 0 });
  });

  it('stops at 3', () => {
    expect(nextLevel(nextLevel({ level: 3, goodRounds: 0 }, 1), 1)).toEqual({ level: 3, goodRounds: 0 });
  });
});

describe('readyForNextLetter', () => {
  const many = (n: number, right: number) => Array.from({ length: n }, (_, i) => a(i < right));

  it('waits for enough first attempts, mostly right', () => {
    expect(readyForNextLetter(many(29, 29), 5, 20)).toBe(false);
    expect(readyForNextLetter(many(30, 26), 5, 20)).toBe(true);
    expect(readyForNextLetter(many(30, 25), 5, 20)).toBe(false);
  });

  it('looks at the latest answers and ignores second attempts', () => {
    expect(readyForNextLetter([...many(10, 0), ...many(30, 30)], 5, 20)).toBe(true);
    expect(readyForNextLetter([...many(30, 30), ...Array.from({ length: 10 }, () => a(true, 2))], 5, 20)).toBe(true);
  });

  it('never at the last letter of the book', () => {
    expect(readyForNextLetter(many(30, 30), 20, 20)).toBe(false);
  });
});
