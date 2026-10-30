import { describe, expect, it } from 'vitest';
import curriculum from '../content/curriculum.json' with { type: 'json' };
import { graphemeOrder } from './allowedWords.ts';
import {
  capacityAt,
  capacityErrors,
  capacityTable,
  validateCurriculum,
  validateTexts,
  validateWords,
  type CapacityConfig,
} from './contentValidation.ts';
import type { Curriculum, Word } from './types.ts';

const book = curriculum as Curriculum;
const pos = (g: string) => graphemeOrder(book).positionOf.get(g)!;

const word = (text: string, syllables: string[], extra: Partial<Word> = {}): Word => ({
  id: text,
  text,
  article: 'η',
  syllables,
  category: 'test',
  imageId: '1F600',
  flags: [],
  tags: [],
  ...extra,
});

const FIXTURE: Word[] = [
  word('πίτα', ['πί', 'τα']),
  word('πατάτα', ['πα', 'τά', 'τα']),
  word('τόπι', ['τό', 'πι'], { article: 'το' }),
  word('Τίνα', ['Τί', 'να'], { article: null }),
  word('πάπια', ['πά', 'πια'], { flags: ['synizesis'] }),
  word('μήλο', ['μή', 'λο'], { article: 'το' }),
  word('ουρά', ['ου', 'ρά']),
];

describe('validateCurriculum', () => {
  it('accepts the book curriculum', () => {
    expect(validateCurriculum(book)).toEqual([]);
  });

  it('rejects repeated and non-atomic graphemes', () => {
    const bad: Curriculum = { book: 'x', units: [{ id: 1, title: '', graphemes: ['α', 'α', 'ντα'], sightWords: [], unlocksFlags: [], skills: [] }] };
    expect(validateCurriculum(bad)).toHaveLength(2);
  });
});

describe('validateWords', () => {
  it('accepts a clean word list', () => {
    expect(validateWords(FIXTURE, book)).toEqual([]);
  });

  it.each([
    ['syllables that do not join', word('πίτα', ['πι', 'τα']), 'do not join'],
    ['syllables that split a digraph', word('ουρά', ['ο', 'υρά']), 'split a grapheme'],
    ['missing synizesis flag', word('πάπια', ['πά', 'πια']), 'detected ["synizesis"]'],
    ['flag that is not there', word('πίτα', ['πί', 'τα'], { flags: ['cluster'] }), 'detected []'],
    ['hand-written computed fields', word('πίτα', ['πί', 'τα'], { minPosition: 3 }), 'computed'],
    ['missing image', word('πίτα', ['πί', 'τα'], { imageId: undefined }), 'imageId'],
    ['grapheme outside the curriculum', word('νεράντζι', ['νε', 'ρά', 'ντζι'], { flags: [] }), 'not in curriculum: ντζ'],
  ])('reports %s', (_, w, message) => {
    expect(validateWords([w], book).join('\n')).toContain(message);
  });

  it('reports duplicates', () => {
    expect(validateWords([FIXTURE[0]!, { ...FIXTURE[0]! }], book).join('\n')).toMatch(/duplicate id[\s\S]*duplicate text/);
  });
});

describe('validateTexts', () => {
  it('reports graphemes outside the curriculum and bad story answers', () => {
    const errors = validateTexts(
      [{ id: 's1', tokens: ['Η', 'Τίνα', 'έχει', 'νεράντζι', '.'] }],
      [{ id: 'st1', sentences: ['Η Τίνα.'], questions: [{ prompt: 'p', imageChoices: ['a'], answer: 1 }] }],
      book,
    );
    expect(errors).toHaveLength(2);
  });
});

describe('capacity', () => {
  it('counts words by what the exercise shows', () => {
    const p = pos('ο');
    expect(capacityAt({ from: 0, shows: 'none', needsImage: true }, 0, book, FIXTURE)).toBe(FIXTURE.length);
    // πίτα, πατάτα, τόπι, Τίνα, πάπια start with taught letters; μήλο, ουρά do not
    expect(capacityAt({ from: 2, shows: 'first-grapheme' }, p, book, FIXTURE)).toBe(5);
    // πάπια needs the synizesis flag, which is still locked
    expect(capacityAt({ from: 4, shows: 'word' }, p, book, FIXTURE)).toBe(4);
    expect(capacityAt({ from: 4, shows: 'word', maxLetters: 4 }, p, book, FIXTURE)).toBe(3);
    expect(capacityAt({ from: 3, shows: 'word', minSyllables: 3 }, p, book, FIXTURE)).toBe(1);
    expect(capacityAt({ from: 4, shows: 'word' }, 3, book, FIXTURE)).toBeNull();
  });

  it('counts distinct letter sounds, not letters', () => {
    expect(capacityAt({ from: 1, shows: 'graphemes' }, pos('η'), book, [])).toBe(8);
  });

  it('fails only at checkpoints', () => {
    const config: CapacityConfig = {
      minWords: 5,
      minChoices: 3,
      checkpoints: [pos('ο')],
      exercises: { 'word-picture': { from: 4, shows: 'word', needsImage: true } },
    };
    const rows = capacityTable(config, book, FIXTURE);
    expect(rows.map((r) => r.position)).toEqual([pos('ο'), 9, 18, 27, 36]);
    expect(capacityErrors(config, rows)).toEqual([expect.stringContaining('word-picture has 4 < 5')]);
    expect(capacityErrors({ ...config, checkpoints: [] }, rows)).toEqual([]);
  });
});
