import { describe, expect, it } from 'vitest';
import { distinctSounds, soundsSame, wordsSoundSame } from './homophones.ts';

describe('homophones', () => {
  it.each([
    ['ο', 'ω'],
    ['ι', 'η'],
    ['ι', 'υ'],
    ['η', 'ει'],
    ['υ', 'οι'],
    ['ε', 'αι'],
  ])('%s sounds like %s', (a, b) => {
    expect(soundsSame(a, b)).toBe(true);
  });

  it.each([
    ['ο', 'ου'],
    ['α', 'αι'],
    ['ε', 'ει'],
    ['π', 'τ'],
  ])('%s does not sound like %s', (a, b) => {
    expect(soundsSame(a, b)).toBe(false);
  });

  it('finds misspellings that sound right', () => {
    expect(wordsSoundSame('πόδι', 'πώδι')).toBe(true);
    expect(wordsSoundSame('παιδί', 'πεδί')).toBe(true);
    expect(wordsSoundSame('πόδι', 'πότι')).toBe(false);
  });

  it('never offers a homophone of the target as a wrong choice', () => {
    // unit 1 letters: ι and η sound the same
    expect(distinctSounds('ι', ['η', 'α', 'ο', 'ε'])).toEqual(['α', 'ο', 'ε']);
    expect(distinctSounds('α', ['ι', 'η', 'ο'])).toEqual(['ι', 'ο']);
  });
});
