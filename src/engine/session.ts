// Session flow, PRD §5: 3 rounds × 5 questions. Before each round the child picks
// one of 3 stations; a break between rounds; never the same mechanism twice in a
// row. When the daily limit is reached, the current round finishes, then the
// session ends with "see you tomorrow".

export const ROUNDS_PER_SESSION = 3;
export const STATIONS_PER_CHOICE = 3;

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
  /** the round could not be made (no content): no star, the child picks again */
  | { type: 'roundSkipped'; options: string[] }
  | { type: 'limitReached' }
  /** leave the break; options are the next stations */
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

    case 'roundSkipped':
      if (phase.kind !== 'play') return state;
      if (state.limitReached) return { ...state, phase: { kind: 'done', reason: 'limit' } };
      return { ...state, phase: action.options.length ? { kind: 'choose', options: action.options } : { kind: 'done', reason: 'complete' } };

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
  /** how often it should come up at this stage (pedagogy review); default 1 */
  weight?: number;
}

/** One of `list`, each as likely as its weight. */
function weightedPick<T>(list: T[], weight: (x: T) => number, rng: () => number): T {
  const total = list.reduce((s, x) => s + weight(x), 0);
  let r = rng() * total;
  for (const x of list) if ((r -= weight(x)) < 0) return x;
  return list[list.length - 1]!;
}

/** A station already played in this session is offered again only now and then. */
const PLAYED_AGAIN = 0.1;
/** A second station of a mechanism already on offer is this much less likely. */
export const SAME_MECHANISM = 0.5;

/**
 * Up to `count` stations: never the previous mechanism (unless nothing else is available)
 * and mostly different mechanisms. Each station is drawn by its weight, so its chance
 * follows its weight whether its mechanism has one game (trace) or twelve (tap-choice).
 * Stations not played yet in this session come first.
 */
export function pickStations(
  candidates: StationCandidate[],
  lastMechanism: string | null,
  played: string[],
  rng: () => number,
  count = STATIONS_PER_CHOICE,
): string[] {
  const fresh = candidates.filter((c) => c.mechanism !== lastMechanism);
  const pool = fresh.length > 0 ? fresh : candidates;
  const timesPlayed = (id: string) => played.filter((p) => p === id).length;
  const weightOf = (c: StationCandidate) => Math.max(c.weight ?? 1, 0.01) * PLAYED_AGAIN ** timesPlayed(c.id);

  const picked: StationCandidate[] = [];
  let left = [...pool];
  while (picked.length < count && left.length > 0) {
    // a mechanism already on offer is less likely, not excluded: excluding it gave the
    // games alone in theirs (trace, memory) far more than their share
    const w = (c: StationCandidate) => weightOf(c) * (picked.some((p) => p.mechanism === c.mechanism) ? SAME_MECHANISM : 1);
    const c = weightedPick(left, w, rng);
    picked.push(c);
    left = left.filter((x) => x !== c);
  }
  // not played yet first; otherwise in the order drawn
  return picked
    .map((c, i) => ({ c, i }))
    .sort((a, b) => timesPlayed(a.c.id) - timesPlayed(b.c.id) || a.i - b.i)
    .map((x) => x.c.id);
}
