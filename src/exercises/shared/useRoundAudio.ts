import { useCallback } from 'react';
import { useApp } from '../../app/AppContext.tsx';
import { praiseKeys } from '../../audio/recordings.ts';
import { soundOf } from '../../engine/homophones.ts';

/** Audio actions every exercise needs. */
export function useRoundAudio() {
  const { audio } = useApp();

  const instruction = useCallback((exerciseId: string) => audio.play({ kind: 'instruction', key: exerciseId }), [audio]);
  const word = useCallback((id: string, text: string, slow = false) => audio.play({ kind: 'word', key: id, text, slow }), [audio]);
  const phoneme = useCallback((g: string) => audio.play({ kind: 'phoneme', key: soundOf(g) }), [audio]);
  const praise = useCallback(() => {
    const keys = praiseKeys();
    return audio.play({ kind: 'praise', key: keys[Math.floor(Math.random() * keys.length)]! });
  }, [audio]);
  const stop = useCallback(() => audio.stop(), [audio]);

  return { instruction, word, phoneme, praise, stop };
}

export const NEXT_ITEM_DELAY_MS = 1100;
