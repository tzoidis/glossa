// Session flow, PRD §5: 3 rounds × 5 questions. Before each round the child picks
// one of 2 stations; a break between rounds; never the same mechanism twice in a
// row. When the daily limit is reached, the current round finishes, then the
// session ends with "see you tomorrow".

export const ROUNDS_PER_SESSION = 3;

export type Phase =
  | { kind: 'choose'; options: string[] }
  | { kind: 'play'; exerciseId: string }
  | { kind: 'break' }
  | { kind: 'done'; reason: 'complete' | 'limit' };

export interface SessionState {
  /** 0-based index of the current (or next) round */
  round: number;
  phase: Phase;
  /** exercise ids of completed rounds, in order */
  played: string[];
  limitReached: boolean;
}

export type SessionAction =
  | { type: 'choose'; exerciseId: string }
  | { type: 'roundComplete' }
  | { type: 'limitReached' }
  /** leave the break; options are the next two stations */
  | { type: 'continue'; options: string[] };

export function startSession(exerciseId: string): SessionState {
  return { round: 0, phase: { kind: 'play', exerciseId }, played: [], limitReached: false };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  const { phase } = state;
  switch (action.type) {
    case 'choose':
      if (phase.kind !== 'choose' || !phase.options.includes(action.exerciseId)) return state;
      return { ...state, phase: { kind: 'play', exerciseId: action.exerciseId } };

    case 'roundComplete': {
      if (phase.kind !== 'play') return state;
      const played = [...state.played, phase.exerciseId];
      const round = state.round + 1;
      const next: Phase = state.limitReached
        ? { kind: 'done', reason: 'limit' }
        : round >= ROUNDS_PER_SESSION
          ? { kind: 'done', reason: 'complete' }
          : { kind: 'break' };
      return { ...state, round, played, phase: next };
    }

    case 'limitReached':
      if (phase.kind === 'play') return { ...state, limitReached: true };
      if (phase.kind === 'done') return state;
      return { ...state, limitReached: true, phase: { kind: 'done', reason: 'limit' } };

    case 'continue':
      if (phase.kind !== 'break') return state;
      if (action.options.length === 0) return { ...state, phase: { kind: 'done', reason: 'complete' } };
      return { ...state, phase: { kind: 'choose', options: action.options } };
  }
}

export interface StationCandidate {
  id: string;
  mechanism: string;
}

/**
 * Up to 2 stations: never the previous mechanism (unless nothing else is available),
 * least-played first, and the two differ in mechanism when possible.
 */
export function pickStations(candidates: StationCandidate[], lastMechanism: string | null, played: string[], rng: () => number): string[] {
  const fresh = candidates.filter((c) => c.mechanism !== lastMechanism);
  const pool = fresh.length > 0 ? fresh : candidates;
  const timesPlayed = (id: string) => played.filter((p) => p === id).length;
  const ranked = pool
    .map((c) => ({ c, r: rng() }))
    .sort((a, b) => timesPlayed(a.c.id) - timesPlayed(b.c.id) || a.r - b.r)
    .map((x) => x.c);

  const first = ranked[0];
  if (!first) return [];
  const second = ranked.find((c) => c.id !== first.id && c.mechanism !== first.mechanism) ?? ranked.find((c) => c.id !== first.id);
  return second ? [first.id, second.id] : [first.id];
}
