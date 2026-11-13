// The reminder to check whether the class moved on: shown to the parent only,
// on «Πάμε!» and above the letters. The parent alone changes the letter.

import { useEffect, useState } from 'react';
import { nextLetterDue } from '../storage/progress.ts';
import { useApp } from './AppContext.tsx';

export function useNextLetterDue(): boolean {
  const { db, child, settings, content } = useApp();
  const [due, setDue] = useState(false);
  const since = settings.letterCheckFrom ?? 0;
  const position = settings.upToPosition;
  const last = content.order.maxPosition;

  useEffect(() => {
    let live = true;
    void nextLetterDue(db, child.id, since, position, last).then((d) => live && setDue(d));
    return () => {
      live = false;
    };
  }, [db, child.id, child.roundsPlayed, since, position, last]);

  return due;
}
