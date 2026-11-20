import { describe, expect, it } from 'vitest';
import { freeGroundSpot } from './BreakView.tsx';

describe('freeGroundSpot', () => {
  it('picks the candidate farthest from the items already placed', () => {
    const candidates = [
      { x: 50, y: 70 },
      { x: 90, y: 88 },
      { x: 52, y: 71 },
    ];
    let k = 0;
    const spot = freeGroundSpot([{ x: 50, y: 70 }], 3, () => candidates[k++]!);
    expect(spot).toEqual({ x: 90, y: 88 });
  });

  it('takes the first spot when the village is empty', () => {
    expect(freeGroundSpot([], 5, () => ({ x: 40, y: 65 }))).toEqual({ x: 40, y: 65 });
  });
});
