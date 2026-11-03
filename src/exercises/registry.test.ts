import { describe, expect, it } from 'vitest';
import { availableExercises, EXERCISES } from './registry.ts';

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
