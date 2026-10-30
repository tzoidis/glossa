import { describe, expect, it, vi } from 'vitest';
import curriculum from '../content/curriculum.json' with { type: 'json' };
import type { Curriculum } from '../engine/types.ts';
import { BrowserAudioService, pickVoice, type AudioDeps, type PlayerLike, type SpeechLike, type UtteranceLike, type VoiceLike } from './AudioService.ts';
import { MockAudioService } from './MockAudioService.ts';
import { phonemeKey, requiredRecordings } from './recordings.ts';

const voice = (lang: string, localService: boolean, name = lang): VoiceLike => ({ name, lang, localService, default: false });

function fakeSpeech(voices: VoiceLike[]) {
  const listeners = new Set<() => void>();
  const spoken: UtteranceLike[] = [];
  const speech: SpeechLike & { spoken: UtteranceLike[]; setVoices(v: VoiceLike[]): void; cancelled: number } = {
    spoken,
    cancelled: 0,
    getVoices: () => voices,
    speak: (u) => {
      spoken.push(u);
      queueMicrotask(() => u.onend?.());
    },
    cancel() {
      this.cancelled++;
    },
    addEventListener: (_t, fn) => listeners.add(fn),
    removeEventListener: (_t, fn) => listeners.delete(fn),
    setVoices(v) {
      voices = v;
      listeners.forEach((fn) => fn());
    },
  };
  return speech;
}

function makeService(over: Partial<AudioDeps> & { recordings?: Record<string, Blob>; bundled?: Record<string, string> } = {}) {
  const played: string[] = [];
  const deps: AudioDeps = {
    getRecording: async (k) => over.recordings?.[k],
    bundledUrl: (k) => over.bundled?.[k],
    speech: fakeSpeech([voice('el-GR', true)]),
    createUtterance: (text) => ({ text, voice: null, lang: '', rate: 1, volume: 1, onend: null, onerror: null }) as UtteranceLike,
    createPlayer: (src): PlayerLike => {
      const p: PlayerLike = {
        onended: null,
        onerror: null,
        pause: () => {},
        play: async () => {
          played.push(src);
          queueMicrotask(() => p.onended?.());
        },
      };
      return p;
    },
    createObjectUrl: () => 'blob:rec',
    revokeObjectUrl: () => {},
    ...over,
  };
  return { service: new BrowserAudioService(deps), played, deps };
}

describe('pickVoice', () => {
  it('picks only local Greek voices', async () => {
    const s = fakeSpeech([voice('en-US', true), voice('el-GR', false, 'cloud'), voice('el_GR', true, 'local')]);
    expect((await pickVoice(s, 50))?.name).toBe('local');
    expect(await pickVoice(fakeSpeech([voice('el-GR', false)]), 50)).toBeNull();
    expect(await pickVoice(null, 50)).toBeNull();
  });

  it('waits for voiceschanged when voices load late', async () => {
    const s = fakeSpeech([]);
    const p = pickVoice(s, 5000);
    s.setVoices([voice('el-GR', true, 'late')]);
    expect((await p)?.name).toBe('late');
  });

  it('notices voices that appear without a voiceschanged event (Safari)', async () => {
    vi.useFakeTimers();
    let voices: VoiceLike[] = [];
    const s = { ...fakeSpeech([]), getVoices: () => voices };
    const p = pickVoice(s, 3000);
    voices = [voice('el-GR', true, 'silent')];
    vi.advanceTimersByTime(300);
    expect((await p)?.name).toBe('silent');
    vi.useRealTimers();
  });

  it('retries after a miss instead of remembering "no voice"', async () => {
    let voices: VoiceLike[] = [voice('en-US', true)];
    const speech = { ...fakeSpeech([]), getVoices: () => voices };
    const { service } = makeService({ speech });
    expect(await service.voice()).toBeNull();
    await Promise.resolve();
    voices = [voice('el-GR', true, 'later')];
    expect((await service.voice())?.name).toBe('later');
  });

  it('gives up after the timeout', async () => {
    vi.useFakeTimers();
    const p = pickVoice(fakeSpeech([]), 1000);
    vi.advanceTimersByTime(1000);
    expect(await p).toBeNull();
    vi.useRealTimers();
  });
});

describe('BrowserAudioService', () => {
  it('prefers the parent recording, then the bundled file, then TTS', async () => {
    const { service } = makeService({
      recordings: { 'word/pie': new Blob(['x']) },
      bundled: { 'word/pie': '/a.mp3', 'word/ball': '/b.mp3' },
    });
    expect(await service.resolveSource({ kind: 'word', key: 'pie', text: 'πίτα' })).toBe('recording');
    expect(await service.resolveSource({ kind: 'word', key: 'ball', text: 'τόπι' })).toBe('bundled');
    expect(await service.resolveSource({ kind: 'word', key: 'melon', text: 'πεπόνι' })).toBe('tts');
  });

  it('never uses TTS for phonemes, instructions or praise', async () => {
    const { service, deps } = makeService();
    for (const kind of ['phoneme', 'instruction', 'praise'] as const) {
      expect(await service.play({ kind, key: 'σ', text: 'σ' })).toBeNull();
    }
    expect((deps.speech as ReturnType<typeof fakeSpeech>).spoken).toEqual([]);
  });

  it('does not speak without a local Greek voice', async () => {
    const { service } = makeService({ speech: fakeSpeech([voice('el-GR', false)]) });
    expect(await service.play({ kind: 'word', key: 'pie', text: 'πίτα' })).toBeNull();
    expect(await service.voice()).toBeNull();
  });

  it('plays files and speaks words, slower after a mistake', async () => {
    const { service, played, deps } = makeService({ bundled: { 'phoneme/σ': '/s.m4a' } });
    expect(await service.play({ kind: 'phoneme', key: 'σ' })).toBe('bundled');
    expect(played).toEqual(['/s.m4a']);

    expect(await service.play({ kind: 'word', key: 'pie', text: 'πίτα', slow: true })).toBe('tts');
    const [u] = (deps.speech as ReturnType<typeof fakeSpeech>).spoken;
    expect(u).toMatchObject({ text: 'πίτα', lang: 'el-GR', rate: 0.6 });
  });

  it('unlock speaks a silent utterance inside the gesture', () => {
    const { service, deps } = makeService();
    service.unlock();
    expect((deps.speech as ReturnType<typeof fakeSpeech>).spoken[0]).toMatchObject({ volume: 0 });
  });

  it('gives up on a file that never ends or errors', async () => {
    vi.useFakeTimers();
    const { service } = makeService({
      bundled: { 'phoneme/σ': '/broken.m4a' },
      maxClipMs: 1000,
      maxStartMs: 5000,
      createPlayer: () => ({ onended: null, onerror: null, pause: () => {}, play: async () => {} }),
    });
    const playing = service.play({ kind: 'phoneme', key: 'σ' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(await playing).toBe('bundled');
    vi.useRealTimers();
  });

  it('stop cancels speech in progress', async () => {
    const speech = fakeSpeech([voice('el-GR', true)]);
    speech.speak = (u) => speech.spoken.push(u); // never ends on its own
    const { service } = makeService({ speech });
    const playing = service.play({ kind: 'sentence', key: 's1', text: 'Η Τίνα.' });
    await vi.waitFor(() => expect(speech.spoken).toHaveLength(1));
    service.stop();
    expect(await playing).toBe('tts');
    expect(speech.cancelled).toBe(1);
  });
});

describe('requiredRecordings', () => {
  const required = requiredRecordings(curriculum as Curriculum);

  it('records one phoneme per sound', () => {
    const phonemes = required.filter((r) => r.kind === 'phoneme');
    expect(phonemeKey('ω')).toBe(phonemeKey('ο'));
    expect(phonemeKey('η')).toBe(phonemeKey('ει'));
    expect(phonemes).toHaveLength(29);
  });

  it('includes every instruction and praise', () => {
    expect(required.filter((r) => r.kind === 'instruction').map((r) => r.key)).toContain('instruction/first-letter');
    expect(required.filter((r) => r.kind === 'praise')).toHaveLength(10);
  });
});

describe('MockAudioService', () => {
  it('records what was played and reports the voice', async () => {
    const mock = new MockAudioService({ voice: null, available: ['instruction/welcome'] });
    expect(await mock.play({ kind: 'instruction', key: 'welcome' })).toBe('bundled');
    expect(await mock.play({ kind: 'word', key: 'pie', text: 'πίτα' })).toBeNull();
    expect(mock.played).toHaveLength(2);
    expect(await mock.voice()).toBeNull();
  });
});
