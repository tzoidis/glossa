// First time in each exercise type, the mascot's hand shows the move on one
// practice question that does not count (PRD §4).

import { createContext, useContext, type ReactNode } from 'react';

const DemoContext = createContext(false);

export function DemoProvider({ children }: { children: ReactNode }) {
  return <DemoContext.Provider value>{children}</DemoContext.Provider>;
}

export function useDemo(): boolean {
  return useContext(DemoContext);
}

const InstructionHeardContext = createContext(false);

/** Wraps the real round right after the demo: its instruction was just heard. */
export function InstructionHeard({ children }: { children: ReactNode }) {
  return <InstructionHeardContext.Provider value>{children}</InstructionHeardContext.Provider>;
}

/** Whether the round should open with its spoken instruction. */
export function useOpensWithInstruction(index: number): boolean {
  return index === 0 && !useContext(InstructionHeardContext);
}

/** A paw that taps. Put it inside the element the child should press. */
export function Hand() {
  return (
    <span className="demo-hand" aria-hidden>
      <svg width="72" height="72" viewBox="0 0 64 64">
        <ellipse cx="32" cy="40" rx="16" ry="14" fill="var(--mascot-face)" stroke="var(--mascot-spikes)" strokeWidth="3" />
        <circle cx="20" cy="22" r="6" fill="var(--mascot-face)" stroke="var(--mascot-spikes)" strokeWidth="3" />
        <circle cx="32" cy="17" r="6" fill="var(--mascot-face)" stroke="var(--mascot-spikes)" strokeWidth="3" />
        <circle cx="44" cy="22" r="6" fill="var(--mascot-face)" stroke="var(--mascot-spikes)" strokeWidth="3" />
      </svg>
    </span>
  );
}
