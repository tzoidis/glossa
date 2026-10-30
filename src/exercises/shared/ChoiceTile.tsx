import type { ReactNode } from 'react';
import { CheckIcon } from '../../ui/Icons.tsx';
import { Hand } from './demo.tsx';
import type { ChoiceState } from './useChoiceRound.ts';

/** A tappable answer. Right and wrong show by shape (✓ badge, dashed and faded), not only colour. */
export function ChoiceTile({
  state,
  hand,
  onPick,
  children,
  label,
  variant = 'letter',
}: {
  state: ChoiceState;
  hand: boolean;
  onPick(): void;
  children: ReactNode;
  label?: string;
  variant?: 'letter' | 'picture' | 'count';
}) {
  return (
    <button type="button" aria-label={label} className={`${variant}-tile ${state}`} onClick={onPick} disabled={state === 'faded'}>
      {children}
      {state === 'correct' && (
        <span className="tile-badge">
          <CheckIcon />
        </span>
      )}
      {hand && <Hand />}
    </button>
  );
}
