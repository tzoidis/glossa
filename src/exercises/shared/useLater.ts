import { useCallback, useEffect, useRef } from 'react';

/**
 * setTimeout that is cleared when the game unmounts: since a round can be left
 * mid-way (hold the home button), a pending step must not play a clip or set
 * state afterwards.
 */
export function useLater() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const all = timers.current;
    return () => {
      all.forEach(clearTimeout);
      all.clear();
    };
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
}
