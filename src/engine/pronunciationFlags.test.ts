import { describe, expect, it } from 'vitest';
import { detectFlags } from './pronunciationFlags.ts';
import type { Flag } from './types.ts';

const CASES: [string, string[] | undefined, Flag[]][] = [
  ['πατάτα', ['πα', 'τά', 'τα'], []],
  ['ποτήρια', ['πο', 'τή', 'ρια'], ['synizesis']],
  ['ρολόι', ['ρο', 'λό', 'ι'], []],
  ['γιαγιά', ['για', 'γιά'], ['synizesis', 'soft-g-ch']],
  ['ποιος', ['ποιος'], ['synizesis']],
  ['γέρος', ['γέ', 'ρος'], ['soft-g-ch']],
  ['χέρι', ['χέ', 'ρι'], ['soft-g-ch']],
  ['γάτα', ['γά', 'τα'], []],
  ['χαρά', ['χα', 'ρά'], []],
  ['κόσμος', ['κό', 'σμος'], ['s-as-z', 'cluster']],
  ['σβήνω', ['σβή', 'νω'], ['s-as-z', 'cluster']],
  ['Άννα', ['Άν', 'να'], ['double-consonant']],
  ['θάλασσα', ['θά', 'λασ', 'σα'], ['double-consonant']],
  ['πρόβατο', ['πρό', 'βα', 'το'], ['cluster']],
  ['σπίτι', ['σπί', 'τι'], ['cluster']],
  ['μπαμπάς', ['μπα', 'μπάς'], []],
  ['ντομάτα', ['ντο', 'μά', 'τα'], []],
  ['παιδί', ['παι', 'δί'], []],
  ['αυγό', ['αυ', 'γό'], []],
  ['τσάι', ['τσά', 'ι'], []],
  // free text, no syllables: unaccented glide before a vowel counts
  ['πιάνο', undefined, ['synizesis']],
  ['Μαρία', undefined, []],
  ['παιδιά', undefined, ['synizesis']],
];

describe('detectFlags', () => {
  it.each(CASES)('%s %j', (word, syllables, expected) => {
    expect(detectFlags(word, syllables)).toEqual(expected);
  });
});
