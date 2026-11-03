// Stroke geometry for «Γράφω με το δάχτυλο»: the paths of strokes.json sampled
// into points, and the check of a traced stroke. Pure, so it is tested without a
// screen. A stroke passes when it starts near the model's start, ends near its
// end, and stays close to it all along when both are walked at the same pace:
// the same shape drawn backwards fails, which is the point (PRD §4: direction).

import strokes from '../../content/strokes.json' with { type: 'json' };

export interface Point {
  x: number;
  y: number;
}

export type LetterCase = 'lower' | 'upper';

type Table = Record<LetterCase, Record<string, string[]>>;
const RIGHT = strokes as unknown as Table;
const LEFT = strokes.leftHanded as unknown as Table;

/**
 * The stroke paths of a letter, in writing order; undefined if the sheet has none.
 * Left-handed children follow their own sheet where it differs (lines drawn
 * right to left, some strokes in another order).
 */
export function strokesOf(letter: string, letterCase: LetterCase, leftHanded = false): string[] | undefined {
  return (leftHanded ? LEFT[letterCase][letter] : undefined) ?? RIGHT[letterCase][letter];
}

export function lettersWithStrokes(letterCase: LetterCase): string[] {
  return Object.keys(RIGHT[letterCase]);
}

const STEPS_PER_CURVE = 24;

/** Points along an SVG path made of absolute M, L, Q and C commands. */
export function samplePath(d: string): Point[] {
  const tokens = d.match(/[MLQC]|-?\d*\.?\d+/g) ?? [];
  const points: Point[] = [];
  let i = 0;
  let cur: Point = { x: 0, y: 0 };
  const num = () => Number(tokens[i++]);
  const pt = () => ({ x: num(), y: num() });
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M' || cmd === 'L') {
      cur = pt();
      points.push(cur);
    } else if (cmd === 'Q') {
      const [c, e] = [pt(), pt()];
      for (let s = 1; s <= STEPS_PER_CURVE; s++) {
        const t = s / STEPS_PER_CURVE;
        const u = 1 - t;
        points.push({ x: u * u * cur.x + 2 * u * t * c.x + t * t * e.x, y: u * u * cur.y + 2 * u * t * c.y + t * t * e.y });
      }
      cur = e;
    } else if (cmd === 'C') {
      const [c1, c2, e] = [pt(), pt(), pt()];
      for (let s = 1; s <= STEPS_PER_CURVE; s++) {
        const t = s / STEPS_PER_CURVE;
        const u = 1 - t;
        points.push({
          x: u * u * u * cur.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * e.x,
          y: u * u * u * cur.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * e.y,
        });
      }
      cur = e;
    } else {
      throw new Error(`unsupported path command ${cmd} in «${d}»`);
    }
  }
  return points;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function pathLength(points: Point[]): number {
  let total = 0;
  for (let k = 1; k < points.length; k++) total += dist(points[k - 1]!, points[k]!);
  return total;
}

/** n points evenly spaced along the polyline, first and last included. */
export function resample(points: Point[], n: number): Point[] {
  if (points.length === 0) return [];
  const total = pathLength(points);
  if (total === 0) return Array.from({ length: n }, () => points[0]!);
  const out: Point[] = [points[0]!];
  let k = 1;
  let walked = 0;
  for (let s = 1; s < n - 1; s++) {
    const target = (total * s) / (n - 1);
    while (k < points.length && walked + dist(points[k - 1]!, points[k]!) < target) walked += dist(points[k - 1]!, points[k++]!);
    const a = points[k - 1]!;
    const b = points[Math.min(k, points.length - 1)]!;
    const seg = dist(a, b) || 1;
    const f = (target - walked) / seg;
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
  }
  out.push(points[points.length - 1]!);
  return out;
}

export type StrokeVerdict = 'ok' | 'start' | 'direction' | 'shape' | 'short';

const SAMPLES = 32;

/**
 * Checks a traced stroke against the model, both in the 0-100 box. `tolerance`
 * is how far (in box units) the finger may stray on average.
 */
export function checkStroke(traced: Point[], model: Point[], tolerance: number): StrokeVerdict {
  const modelLength = pathLength(model);
  if (traced.length < 2 || pathLength(traced) < modelLength * 0.5) return 'short';
  const t = resample(traced, SAMPLES);
  const m = resample(model, SAMPLES);
  const start = dist(t[0]!, m[0]!);
  const reversed = dist(t[0]!, m[SAMPLES - 1]!) < start && dist(t[SAMPLES - 1]!, m[0]!) < dist(t[SAMPLES - 1]!, m[SAMPLES - 1]!);
  // a closed shape (ο) has its start and end together: only the walk tells the way round
  const closed = dist(m[0]!, m[SAMPLES - 1]!) < tolerance;
  if (!closed && reversed) return 'direction';
  if (start > tolerance * 2) return 'start';
  const gaps = t.map((p, k) => dist(p, m[k]!));
  const mean = gaps.reduce((a, b) => a + b, 0) / SAMPLES;
  if (mean > tolerance || Math.max(...gaps) > tolerance * 2.5) return closed ? 'direction' : 'shape';
  return 'ok';
}
