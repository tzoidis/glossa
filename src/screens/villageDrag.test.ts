import { describe, expect, it } from 'vitest';
import { insideScene, scenePercent } from './villageDrag.ts';

const scene = { left: 100, top: 50, width: 800, height: 400 };

describe('village drag', () => {
  it('turns a finger position into a percent of the scene', () => {
    expect(scenePercent(500, 250, scene)).toEqual({ x: 50, y: 50 });
    expect(scenePercent(300, 150, scene)).toEqual({ x: 25, y: 25 });
  });

  it('keeps items inside the scene', () => {
    expect(scenePercent(0, 0, scene)).toEqual({ x: 4, y: 4 });
    expect(scenePercent(2000, 2000, scene)).toEqual({ x: 96, y: 96 });
  });

  it('knows when a drop lands in the scene', () => {
    expect(insideScene(500, 250, scene)).toBe(true);
    expect(insideScene(500, 600, scene)).toBe(false);
  });
});
