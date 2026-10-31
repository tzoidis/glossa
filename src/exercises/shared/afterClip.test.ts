import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { afterClip } from './afterClip.ts';

describe('afterClip', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const clipOf = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('waits for a long praise clip before moving on', async () => {
    const next = vi.fn();
    void afterClip(clipOf(2500), 1100, () => true, next);
    await vi.advanceTimersByTimeAsync(1100);
    expect(next).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1400);
    expect(next).toHaveBeenCalledOnce();
  });

  it('waits the minimum after a short clip, so the glow is seen', async () => {
    const next = vi.fn();
    void afterClip(clipOf(300), 1100, () => true, next);
    await vi.advanceTimersByTimeAsync(1000);
    expect(next).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(next).toHaveBeenCalledOnce();
  });

  it('does not move on after the screen is gone', async () => {
    const next = vi.fn();
    void afterClip(clipOf(500), 1100, () => false, next);
    await vi.advanceTimersByTimeAsync(2000);
    expect(next).not.toHaveBeenCalled();
  });
});
