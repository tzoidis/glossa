// AudioService, PRD §6. Source priority: parent recording → bundled file → TTS.
// TTS only for syllables, words and sentences, and only with a local el-GR voice,
// so it works offline and no text leaves the device. Phonemes, instructions and
// praise are never spoken by TTS.

import { audioKey, TTS_KINDS, type AudioKind } from './recordings.ts';

export type AudioSource = 'recording' | 'bundled' | 'tts';

export interface AudioRequest {
  kind: AudioKind;
  key: string;
  /** text for TTS fallback (words, sentences, syllables) */
  text?: string;
  /** slower, for feedback after a mistake */
  slow?: boolean;
}

export interface VoiceInfo {
  name: string;
  lang: string;
  local: boolean;
}

export interface AudioService {
  /** Call inside the «Πάμε!» tap: browsers block audio before a user gesture. */
  unlock(): void;
  /**
   * Resolves when playback ends; null if nothing could be played. A new play()
   * replaces the clip in progress, including one still looking for its source.
   */
  play(req: AudioRequest): Promise<AudioSource | null>;
  /** Stops the clip and ends every running sequence (a new tap, leaving a screen). */
  stop(): void;
  /** For a run of several clips: alive() turns false at the next stop(). */
  sequence(): { alive(): boolean };
  resolveSource(req: AudioRequest): Promise<AudioSource | null>;
  /** The local Greek voice in use, or null (exercises needing localTTS are then hidden). */
  voice(): Promise<VoiceInfo | null>;
}

// ---- browser dependencies, injected for tests ----

export interface VoiceLike {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export interface UtteranceLike {
  voice: VoiceLike | null;
  lang: string;
  rate: number;
  volume: number;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export interface SpeechLike {
  getVoices(): VoiceLike[];
  speak(u: UtteranceLike): void;
  cancel(): void;
  addEventListener(type: 'voiceschanged', fn: () => void): void;
  removeEventListener(type: 'voiceschanged', fn: () => void): void;
}

export interface PlayerLike {
  play(): Promise<void>;
  pause(): void;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  onplaying?: (() => void) | null;
}

export interface AudioDeps {
  getRecording(key: string): Promise<Blob | undefined>;
  bundledUrl(key: string): string | undefined;
  speech: SpeechLike | null;
  createUtterance(text: string): UtteranceLike;
  createPlayer(src: string): PlayerLike;
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  voiceTimeoutMs?: number;
  /** longest a recorded clip may take before playback is abandoned */
  maxClipMs?: number;
  /** a clip that has not started playing by then is abandoned */
  maxStartMs?: number;
}

/** Instructions are the longest clips (~6.5 s, ~9 s at slow speed); syllables and words are far shorter. */
const MAX_CLIP_MS = 15_000;
/** generous: over Wi-Fi from the dev server, or on a busy device, a clip can take seconds to begin */
const MAX_START_MS = 5_000;
const NORMAL_RATE = 0.9;
const SLOW_RATE = 0.6;

export function isLocalGreek(v: VoiceLike): boolean {
  return v.localService && v.lang.replace('_', '-').toLowerCase().startsWith('el');
}

const POLL_MS = 250;

/**
 * getVoices() is often empty at first. Chrome fires 'voiceschanged' when the list
 * arrives; Safari may fill it silently, so poll too. Give up after timeoutMs.
 */
export function pickVoice(speech: SpeechLike | null, timeoutMs: number): Promise<VoiceLike | null> {
  if (!speech) return Promise.resolve(null);
  const choose = (voices: VoiceLike[]) => {
    const greek = voices.filter(isLocalGreek);
    return greek.find((v) => v.default) ?? greek[0] ?? null;
  };
  const now = speech.getVoices();
  if (now.length > 0) return Promise.resolve(choose(now));
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      clearInterval(poll);
      speech.removeEventListener('voiceschanged', check);
      resolve(choose(speech.getVoices()));
    };
    const check = () => {
      if (speech.getVoices().length > 0) finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    const poll = setInterval(check, POLL_MS);
    speech.addEventListener('voiceschanged', check);
  });
}

export class BrowserAudioService implements AudioService {
  private voicePromise: Promise<VoiceLike | null> | null = null;
  private current: { stop(): void } | null = null;
  /** bumped by every play() and stop(): a play that is no longer the latest gives up */
  private playSeq = 0;
  /** bumped by stop() only: ends sequences */
  private epoch = 0;
  private readonly deps: AudioDeps;

  constructor(deps: AudioDeps) {
    this.deps = deps;
  }

  private getVoice(): Promise<VoiceLike | null> {
    const p = (this.voicePromise ??= pickVoice(this.deps.speech, this.deps.voiceTimeoutMs ?? 3000));
    // Not found yet is not final: voices can appear later (e.g. after the first tap on iOS).
    void p.then((v) => {
      if (!v && this.voicePromise === p) this.voicePromise = null;
    });
    return p;
  }

  unlock(): void {
    // iOS needs one speak() inside the gesture before later speech is allowed.
    const { speech } = this.deps;
    if (!speech) return;
    const u = this.deps.createUtterance('');
    u.volume = 0;
    speech.speak(u);
    void this.getVoice();
  }

  async voice(): Promise<VoiceInfo | null> {
    const v = await this.getVoice();
    return v && { name: v.name, lang: v.lang, local: v.localService };
  }

  async resolveSource(req: AudioRequest): Promise<AudioSource | null> {
    const key = audioKey(req.kind, req.key);
    if (await this.deps.getRecording(key)) return 'recording';
    if (this.deps.bundledUrl(key)) return 'bundled';
    if (TTS_KINDS.has(req.kind) && req.text && (await this.getVoice())) return 'tts';
    return null;
  }

  stop(): void {
    this.epoch++;
    this.playSeq++;
    this.halt();
  }

  sequence(): { alive(): boolean } {
    const epoch = this.epoch;
    return { alive: () => this.epoch === epoch };
  }

  private halt(): void {
    this.current?.stop();
    this.current = null;
  }

  async play(req: AudioRequest): Promise<AudioSource | null> {
    const seq = ++this.playSeq;
    this.halt();
    const key = audioKey(req.kind, req.key);
    // looking up a recording takes a moment: a newer play() or a stop() may come first
    const superseded = () => seq !== this.playSeq;

    const recording = await this.deps.getRecording(key);
    if (superseded()) return null;
    if (recording) {
      const url = this.deps.createObjectUrl(recording);
      try {
        await this.playUrl(url, req.slow);
      } finally {
        this.deps.revokeObjectUrl(url);
      }
      return 'recording';
    }

    const bundled = this.deps.bundledUrl(key);
    if (bundled) {
      await this.playUrl(bundled, req.slow);
      return 'bundled';
    }

    if (TTS_KINDS.has(req.kind) && req.text) {
      const voice = await this.getVoice();
      if (superseded()) return null;
      if (voice && this.deps.speech) {
        await this.speak(this.deps.speech, voice, req.text, req.slow);
        return 'tts';
      }
    }
    return null;
  }

  private playUrl(src: string, slow?: boolean): Promise<void> {
    const player = this.deps.createPlayer(src);
    if (slow && 'playbackRate' in player) (player as { playbackRate: number }).playbackRate = 0.75;
    return new Promise((resolve) => {
      // A broken or empty file may never fire 'ended' or 'error': never let it stall an exercise.
      const abandon = () => {
        player.pause();
        done();
      };
      const guard = setTimeout(abandon, this.deps.maxClipMs ?? MAX_CLIP_MS);
      const startGuard = setTimeout(abandon, this.deps.maxStartMs ?? MAX_START_MS);
      const done = () => {
        clearTimeout(guard);
        clearTimeout(startGuard);
        resolve();
      };
      player.onplaying = () => clearTimeout(startGuard);
      player.onended = done;
      player.onerror = done;
      this.current = {
        stop: () => {
          player.pause();
          done();
        },
      };
      player.play().catch(done);
    });
  }

  private speak(speech: SpeechLike, voice: VoiceLike, text: string, slow?: boolean): Promise<void> {
    const u = this.deps.createUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = slow ? SLOW_RATE : NORMAL_RATE;
    return new Promise((resolve) => {
      u.onend = () => resolve();
      u.onerror = () => resolve();
      this.current = {
        stop: () => {
          speech.cancel();
          resolve();
        },
      };
      speech.speak(u);
    });
  }
}

/** Wires the service to the real browser and the recordings table. */
export function createBrowserAudioService(getRecording: (key: string) => Promise<Blob | undefined>, bundledUrl: (key: string) => string | undefined): AudioService {
  const speech = typeof speechSynthesis === 'undefined' ? null : (speechSynthesis as unknown as SpeechLike);
  return new BrowserAudioService({
    getRecording,
    bundledUrl,
    speech,
    createUtterance: (text) => new SpeechSynthesisUtterance(text) as unknown as UtteranceLike,
    createPlayer: (src) => new Audio(src) as unknown as PlayerLike,
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  });
}
