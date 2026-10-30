import { describe, expect, it } from 'vitest';
import curriculum from '../content/curriculum.json' with { type: 'json' };
import { analyzeWord, graphemeOrder, isTextAllowed, isWordAllowed, makeContext, type Progress } from './allowedWords.ts';
import type { Curriculum, Word } from './types.ts';

const book = curriculum as Curriculum;
const order = graphemeOrder(book);
const pos = (g: string) => order.positionOf.get(g)!;
const ctx = (p: Progress, words: Word[] = []) => makeContext(book, p, words);
const allowed = (text: string, p: Progress) => isWordAllowed(text, ctx(p));

describe('grapheme order', () => {
  it('follows the book: unit 1 starts α ν ι τ π', () => {
    expect(order.order.slice(0, 5)).toEqual(['α', 'ν', 'ι', 'τ', 'π']);
    expect(pos('α')).toBe(1);
    expect(order.unitStart.get(2)).toBe(9);
  });
});

describe('isWordAllowed', () => {
  it('needs every grapheme taught', () => {
    expect(allowed('πατάτα', { position: pos('π') - 1 })).toBe(false);
    expect(allowed('πατάτα', { position: pos('π') })).toBe(true);
    expect(allowed('ΠΑΤΑΤΑ', { position: pos('π') })).toBe(true);
  });

  it('treats a digraph as its own grapheme', () => {
    expect(allowed('ουρά', { position: pos('ρ') })).toBe(false);
    expect(allowed('ουρά', { position: pos('ου') })).toBe(true);
  });

  it('allows sight words from the start of their unit, bypassing flags', () => {
    expect(allowed('είναι', { position: 0 })).toBe(false);
    expect(allowed('είναι', { position: 1 })).toBe(true);
    expect(allowed('Έχει', { position: 1 })).toBe(true); // has soft-g-ch
  });

  it('blocks locked pronunciation flags until unlocked', () => {
    const p = { position: pos('η') };
    expect(allowed('Άννα', p)).toBe(false);
    expect(allowed('Άννα', { ...p, extraFlags: ['double-consonant'] })).toBe(true);
    expect(allowed('κόσμος', { position: pos('ου') })).toBe(false);
    expect(allowed('κόσμος', { position: pos('ου'), extraFlags: ['s-as-z', 'cluster'] })).toBe(true);
  });

  it('uses hand-checked flags for bank words instead of detection', () => {
    // «πιάνο» is detected as synizesis; a bank entry marked otherwise wins.
    const word: Word = { id: 'x', text: 'πιάνο', article: 'το', syllables: ['πιά', 'νο'], category: 't', flags: [], tags: [] };
    const p = { position: pos('ν') + 5 };
    expect(isWordAllowed('πιάνο', ctx(p))).toBe(false);
    expect(isWordAllowed('πιάνο', ctx(p, [word]))).toBe(true);
  });

  it('locks diaeresis behind its own skill', () => {
    const p = { position: pos('κ') };
    expect(allowed('καΐκι', p)).toBe(false);
    expect(allowed('καΐκι', { ...p, extraSkills: ['diaeresis'] })).toBe(true);
  });

  it('never allows graphemes outside the curriculum', () => {
    const all = { position: order.order.length, extraFlags: ['cluster' as const] };
    expect(allowed('νεράντζι', all)).toBe(false);
    expect(allowed('cat', all)).toBe(false);
  });
});

describe('isTextAllowed', () => {
  it('checks every word of a sentence', () => {
    expect(isTextAllowed('Η Νίνα και η Τίνα.', ctx({ position: pos('η') }))).toBe(true);
    expect(isTextAllowed('Η Τίνα είναι εκεί.', ctx({ position: pos('κ') }))).toBe(false); // «ει» is unit 3
    expect(isTextAllowed('Η Τίνα έχει ρόδι.', ctx({ position: pos('η') }))).toBe(false);
  });
});

describe('analyzeWord', () => {
  it('computes graphemes and minPosition', () => {
    const w = analyzeWord({ id: 'p', text: 'πάπια', article: 'η', syllables: ['πά', 'πια'], category: 'ζώα', flags: ['synizesis'], tags: [] }, order);
    expect(w.graphemes).toEqual(['π', 'α', 'π', 'ι', 'α']);
    expect(w.minPosition).toBe(pos('π'));
  });
});
