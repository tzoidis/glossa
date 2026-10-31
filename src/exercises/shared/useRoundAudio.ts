import { useCallback, useMemo } from 'react';
import { useApp } from '../../app/AppContext.tsx';
import { praiseKeys } from '../../audio/recordings.ts';

/** Audio actions every exercise needs. */
export function useRoundAudio() {
  const { audio } = useApp();

  const instruction = useCallback((exerciseId: string) => audio.play({ kind: 'instruction', key: exerciseId }), [audio]);
  const word = useCallback((id: string, text: string, slow = false) => audio.play({ kind: 'word', key: id, text, slow }), [audio]);
  // bundled clip by sound (src/audio/files/syllable/), else the local voice
  const syllable = useCallback((s: string, slow = false) => audio.play({ kind: 'syllable', key: s, text: s, slow }), [audio]);
  const praise = useCallback(() => {
    const keys = praiseKeys();
    return audio.play({ kind: 'praise', key: keys[Math.floor(Math.random() * keys.length)]! });
  }, [audio]);
  const stop = useCallback(() => audio.stop(), [audio]);
  const sequence = useCallback(() => audio.sequence(), [audio]);
  /** The speaker button: ends anything playing (or a running sequence) first. */
  const replay = useCallback(
    (play: () => Promise<unknown>) => {
      audio.stop();
      void play();
    },
    [audio],
  );

  // stable across renders: effects that depend on it must not restart the sound
  return useMemo(() => ({ instruction, word, syllable, praise, stop, sequence, replay }), [instruction, word, syllable, praise, stop, sequence, replay]);
}

export const NEXT_ITEM_DELAY_MS = 1100;
