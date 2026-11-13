import { describe, expect, it } from 'vitest';
import { CONTENT, withCustomWords } from '../../app/content.ts';
import { makeContext } from '../../engine/allowedWords.ts';
import type { CustomWord } from '../../storage/schema.ts';
import { isTaken, listedName, parseInput, whenReadable } from './myWords.ts';

const custom = (over: Partial<CustomWord>): CustomWord => ({
  id: 'custom-1',
  childId: 'child-1',
  text: 'σκυλάκι',
  article: 'το',
  syllables: ['σκυ', 'λά', 'κι'],
  kind: 'word',
  createdAt: 0,
  ...over,
});

describe('parseInput', () => {
  it('finds a listed name however it is typed', () => {
    for (const typed of ['Μαρία', 'μαρία', 'μαρια', 'ΜΑΡΙΑ', 'Μα-ρί-α', ' Μαρία ', 'Μαρία'.normalize('NFD')]) {
      const p = parseInput(typed, 'name');
      expect(p.ok && p.listed?.id, typed).toBe('name-maria');
    }
  });

  it('splits a word at the hyphens, lower case', () => {
    expect(parseInput('Σκυ-λά-κι', 'word')).toEqual({ ok: true, text: 'σκυλάκι', syllables: ['σκυ', 'λά', 'κι'] });
  });

  it('gives a name not in the list its capital', () => {
    expect(parseInput('μα-ρι-λέ-να', 'name')).toEqual({ ok: true, text: 'Μαριλένα', syllables: ['Μα', 'ρι', 'λέ', 'να'] });
  });

  it('warns about a long word without hyphens and a missing accent', () => {
    expect(parseInput('Μαριλένα', 'name')).toMatchObject({ ok: true, warn: 'hyphens' });
    expect(parseInput('γα-τα', 'word')).toMatchObject({ ok: true, warn: 'accent' });
    expect(parseInput('Ρεξ', 'name')).toEqual({ ok: true, text: 'Ρεξ', syllables: ['Ρεξ'] });
  });

  it('refuses Latin letters, spaces and digits', () => {
    for (const bad of ['Rex', 'γάτα μου', 'γάτα2']) expect(parseInput(bad, 'word')).toEqual({ ok: false, error: 'invalid' });
    expect(parseInput('  ', 'word')).toEqual({ ok: false, error: 'empty' });
  });

  it('a listed name is not found by a word that only contains it', () => {
    expect(listedName('Μαριάννα')?.id).toBe('name-marianna');
    expect(listedName('Μαρ')).toBeUndefined();
  });
});

describe('isTaken', () => {
  it('knows the bank words and the words already added', () => {
    expect(isTaken('Γάτα', CONTENT)).toBe(true);
    expect(isTaken('σκυλάκι', CONTENT)).toBe(false);
    expect(isTaken('σκυλάκι', withCustomWords(CONTENT, [custom({})]))).toBe(true);
  });
});

describe('whenReadable', () => {
  const at = (text: string, position: number) => {
    const content = withCustomWords(CONTENT, [custom({ id: 'name-maria', text, syllables: [], kind: 'name', article: 'η' })]);
    return whenReadable(text, position, content, makeContext(content.curriculum, { position }, content.words));
  };

  it('says now once every letter is taught', () => {
    expect(at('Μαρία', CONTENT.order.maxPosition)).toEqual({ now: true });
  });

  it('names the letter that unlocks the word', () => {
    const r = at('Μαρία', 0);
    expect(r.now).toBe(false);
    // the last of μ, α, ρ, ι in book order
    const last = ['μ', 'α', 'ρ', 'ι'].map((g) => CONTENT.order.positionOf.get(g)!).sort((a, b) => b - a)[0]!;
    expect(r).toEqual({ now: false, grapheme: CONTENT.order.order[last - 1] });
  });

  it('names the unit when a pronunciation flag, not a letter, holds the word back', () => {
    const content = withCustomWords(CONTENT, [custom({})]);
    const position = CONTENT.order.unitStart.get(3)!;
    const r = whenReadable('σκυλάκι', position, content, makeContext(content.curriculum, { position }, content.words));
    expect(r).toEqual({ now: false, unit: 4 });
  });
});
