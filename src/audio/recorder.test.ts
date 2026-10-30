import { describe, expect, it } from 'vitest';
import { pickMimeType } from './recorder.ts';

describe('pickMimeType', () => {
  it('prefers AAC/mp4 (Safari), then WebM/Opus (Chrome)', () => {
    expect(pickMimeType((t) => t === 'audio/mp4' || t.startsWith('audio/webm'))).toBe('audio/mp4');
    expect(pickMimeType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(pickMimeType(() => false)).toBeUndefined();
  });
});
