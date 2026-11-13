import { describe, expect, it } from 'vitest';
import { availableExercises, EXERCISES, isEnabled } from './registry.ts';

const ids = (hasTouch: boolean) =>
  availableExercises(EXERCISES, { position: 36, enabledExercises: null, hasLocalVoice: true, hasTouch }).map((e) => e.module.id);

describe('availableExercises', () => {
  it('hides tracing without a touch screen and keeps everything else', () => {
    expect(ids(true)).toContain('trace');
    expect(ids(false)).not.toContain('trace');
    expect(ids(false)).toEqual(ids(true).filter((id) => id !== 'trace'));
  });

  it('marks only tracing as touch-only', () => {
    expect(EXERCISES.filter((e) => e.touchOnly).map((e) => e.module.id)).toEqual(['trace']);
  });
});

describe('isEnabled', () => {
  it('keeps a game added after the parent changed the list switched on', () => {
    const s = { enabledExercises: ['first-letter'], knownExercises: ['first-letter', 'trace'] };
    expect(isEnabled('first-letter', s)).toBe(true);
    expect(isEnabled('trace', s)).toBe(false); // turned off by the parent
    expect(isEnabled('dictation', s)).toBe(true); // did not exist yet
    expect(isEnabled('anything', { enabledExercises: null })).toBe(true);
    // lists saved before knownExercises existed: as before, only what is listed
    expect(isEnabled('dictation', { enabledExercises: ['first-letter'] })).toBe(false);
  });
});
