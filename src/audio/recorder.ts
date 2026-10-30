// In-app recording (PRD §6) for corrections and missing sounds. The format is
// whatever this browser records (Safari: AAC/mp4, Chrome: WebM/Opus), stored with
// its mimeType. Needs a secure context and microphone permission.

import { useCallback, useRef, useState } from 'react';

const CANDIDATES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

export function pickMimeType(isSupported: (t: string) => boolean): string | undefined {
  return CANDIDATES.find((t) => isSupported(t));
}

export function canRecord(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

export type RecorderState = 'idle' | 'recording' | 'error';

export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      r.start();
      recorder.current = r;
      setState('recording');
    } catch {
      setState('error');
    }
  }, []);

  const stop = useCallback(
    () =>
      new Promise<{ blob: Blob; mimeType: string } | null>((resolve) => {
        const r = recorder.current;
        if (!r) return resolve(null);
        r.onstop = () => {
          r.stream.getTracks().forEach((track) => track.stop());
          const mimeType = r.mimeType || chunks.current[0]?.type || 'audio/webm';
          recorder.current = null;
          setState('idle');
          resolve(chunks.current.length ? { blob: new Blob(chunks.current, { type: mimeType }), mimeType } : null);
        };
        r.stop();
      }),
    [],
  );

  return { state, start, stop };
}
