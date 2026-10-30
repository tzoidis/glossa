import type { ReactNode } from 'react';

export function IconButton({
  label,
  onClick,
  children,
  variant = 'plain',
}: {
  /** accessible name only; never shown */
  label: string;
  onClick(): void;
  children: ReactNode;
  variant?: 'plain' | 'primary';
}) {
  return (
    <button type="button" className={`icon-button icon-button--${variant}`} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}
