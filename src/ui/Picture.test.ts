import { describe, expect, it } from 'vitest';
import words from '../content/words.json' with { type: 'json' };
import { EXERCISES } from '../exercises/registry.ts';
import { pictureUrl } from './Picture.tsx';

// A word or station without a bundled OpenMoji picture would fall back to the
// device's emoji font: run node scripts/build-openmoji-subset.ts.
describe('bundled pictures', () => {
  it('every word picture and station icon is a bundled OpenMoji SVG', () => {
    const codes = [...words.map((w) => w.imageId), ...EXERCISES.map((e) => e.icon)].filter((c): c is string => Boolean(c));
    expect(codes.filter((c) => !pictureUrl(c))).toEqual([]);
  });
});
