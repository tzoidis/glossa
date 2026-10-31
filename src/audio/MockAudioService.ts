// Silent AudioService for tests and the Playwright smoke test (PRD §8).

import { TTS_KINDS } from './recordings.ts';
import type { AudioRequest, AudioService, AudioSource, VoiceInfo } from './AudioService.ts';

export interface MockAudioOptions {
  /** null = no local Greek voice */
  voice?: VoiceInfo | null;
  /** keys (kind/key) that have a recording or bundled file */
  available?: Iterable<string>;
}

export class MockAudioService implements AudioService {
  readonly played: AudioRequest[] = [];
  unlocked = false;
  stops = 0;
  private readonly voiceInfo: VoiceInfo | null;
  private readonly available: Set<string> | null;

  constructor(options: MockAudioOptions = {}) {
    this.voiceInfo = options.voice === undefined ? { name: 'mock', lang: 'el-GR', local: true } : options.voice;
    this.available = options.available ? new Set(options.available) : null;
  }

  unlock(): void {
    this.unlocked = true;
  }

  stop(): void {
    this.stops++;
  }

  sequence(): { alive(): boolean } {
    const at = this.stops;
    return { alive: () => this.stops === at };
  }

  async voice(): Promise<VoiceInfo | null> {
    return this.voiceInfo;
  }

  async resolveSource(req: AudioRequest): Promise<AudioSource | null> {
    if (!this.available || this.available.has(`${req.kind}/${req.key}`)) return 'bundled';
    return TTS_KINDS.has(req.kind) && req.text && this.voiceInfo ? 'tts' : null;
  }

  async play(req: AudioRequest): Promise<AudioSource | null> {
    this.played.push(req);
    return this.resolveSource(req);
  }
}
