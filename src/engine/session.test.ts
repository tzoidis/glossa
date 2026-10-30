import { describe, expect, it } from 'vitest';
import { dueKeys, updateReview } from './reviewQueue.ts';
import { mulberry32, shuffle } from './rng.ts';
import { pickStations, ROUNDS_PER_SESSION, sessionReducer, startSession, type SessionState } from './session.ts';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(shuffle([1, 2, 3, 4, 5], mulberry32(7))).toEqual(shuffle([1, 2, 3, 4, 5], mulberry32(7)));
  });
});

describe('session flow', () => {
  const play = (s: SessionState) => sessionReducer(s, { type: 'roundComplete' });

  it('runs 3 rounds with a break and a choice between them', () => {
    let s = startSession('a');
    s = play(s);
    expect(s.phase).toEqual({ kind: 'break' });
    s = sessionReducer(s, { type: 'continue', options: ['b', 'c'] });
    expect(s.phase).toEqual({ kind: 'choose', options: ['b', 'c'] });
    s = sessionReducer(s, { type: 'choose', exerciseId: 'x' }); // not offered: ignored
    expect(s.phase.kind).toBe('choose');
    s = sessionReducer(s, { type: 'choose', exerciseId: 'c' });
    s = play(s);
    s = sessionReducer(s, { type: 'continue', options: ['a', 'b'] });
    s = sessionReducer(s, { type: 'choose', exerciseId: 'b' });
    s = play(s);
    expect(s.phase).toEqual({ kind: 'done', reason: 'complete' });
    expect(s.played).toEqual(['a', 'c', 'b']);
    expect(s.round).toBe(ROUNDS_PER_SESSION);
  });

  it('lets the current round finish when the limit is reached', () => {
    let s = sessionReducer(startSession('a'), { type: 'limitReached' });
    expect(s.phase.kind).toBe('play');
    s = play(s);
    expect(s.phase).toEqual({ kind: 'done', reason: 'limit' });
  });

  it('ends at once if the limit is reached during a break', () => {
    const s = sessionReducer(play(startSession('a')), { type: 'limitReached' });
    expect(s.phase).toEqual({ kind: 'done', reason: 'limit' });
  });
});

describe('pickStations', () => {
  const rng = mulberry32(1);
  const c = [
    { id: 'tap1', mechanism: 'tap' },
    { id: 'tap2', mechanism: 'tap' },
    { id: 'order1', mechanism: 'order' },
    { id: 'listen1', mechanism: 'listen' },
  ];

  it('never offers the previous mechanism', () => {
    for (let i = 0; i < 50; i++) {
      const picked = pickStations(c, 'tap', [], mulberry32(i));
      expect(picked).toHaveLength(2); // only order1 and listen1 are left
      expect(picked.some((id) => id.startsWith('tap'))).toBe(false);
    }
  });

  it('offers three stations with as many different mechanisms as it can', () => {
    for (let i = 0; i < 50; i++) {
      const picked = pickStations(c, null, [], mulberry32(i));
      expect(picked).toHaveLength(3);
      expect(new Set(picked.map((id) => c.find((x) => x.id === id)!.mechanism)).size).toBe(3);
    }
  });

  it('fills the third station with a repeated mechanism rather than show two', () => {
    const picked = pickStations([...c, { id: 'order2', mechanism: 'order' }], 'listen', [], mulberry32(3));
    expect(picked).toHaveLength(3);
    expect(picked).not.toContain('listen1');
  });

  it('prefers stations not played yet', () => {
    expect(pickStations(c, 'tap', ['order1'], rng)[0]).toBe('listen1');
  });

  it('falls back to the same mechanism rather than nothing', () => {
    expect(pickStations([{ id: 'tap1', mechanism: 'tap' }], 'tap', [], rng)).toEqual(['tap1']);
    expect(pickStations([], null, [], rng)).toEqual([]);
  });
});

describe('review queue', () => {
  it('brings mistakes back next round and spaces out successes', () => {
    const wrong = updateReview(undefined, 'c', 'word:pie', false, 10, 0);
    expect(wrong).toMatchObject({ interval: 1, dueRound: 11, lapses: 1 });
    const right1 = updateReview(wrong, 'c', 'word:pie', true, 11, 0);
    const right2 = updateReview(right1, 'c', 'word:pie', true, 13, 0);
    expect([right1.interval, right2.interval]).toEqual([2, 4]);
    expect(right2.lapses).toBe(1);
    expect(updateReview(undefined, 'c', 'word:ball', true, 0, 0).interval).toBe(4);
  });

  it('lists due keys, most overdue first', () => {
    const items = [
      updateReview(undefined, 'c', 'a', false, 5, 0), // due 6
      updateReview(undefined, 'c', 'b', false, 3, 0), // due 4
      updateReview(undefined, 'c', 'z', true, 5, 0), // due 9
    ];
    expect(dueKeys(items, 6)).toEqual(['b', 'a']);
  });
});
