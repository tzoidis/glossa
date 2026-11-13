// The strip above every game (UI review): the mascot replays the instruction, five
// pebbles fill as questions are solved, and home is pressed and held to leave, so
// a stray tap does not end the round. Navigation never uses text (PRD §6).

import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { t } from '../i18n.ts';
import { IconButton } from '../ui/IconButton.tsx';
import { HomeIcon } from '../ui/Icons.tsx';
import { Mascot } from '../ui/Mascot.tsx';

const HOLD_MS = 1200;

function HoldToLeave({ onLeave }: { onLeave(): void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  useEffect(() => stop, []);
  return (
    <button
      type="button"
      className={`hold-home ${holding ? 'hold-home--holding' : ''}`}
      aria-label={t('round.leave')}
      onPointerDown={() => {
        setHolding(true);
        timer.current = setTimeout(onLeave, HOLD_MS);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <HomeIcon />
    </button>
  );
}

export function RoundBar({ exerciseId, total, done, onLeave }: { exerciseId: string; total: number | null; done: number; onLeave(): void }) {
  const { audio } = useApp();
  return (
    <div className="round-bar">
      <IconButton
        label={t('round.help')}
        onClick={() => {
          audio.stop();
          void audio.play({ kind: 'instruction', key: exerciseId });
        }}
      >
        <Mascot mood="happy" size={52} />
      </IconButton>
      <div className="pebbles" aria-hidden>
        {total !== null && Array.from({ length: total }, (_, i) => <span key={i} className={`pebble ${i < done ? 'pebble--done' : ''}`} />)}
      </div>
      <HoldToLeave onLeave={onLeave} />
    </div>
  );
}
