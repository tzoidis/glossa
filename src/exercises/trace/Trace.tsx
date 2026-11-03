// The tracing board. Each stroke is checked when the finger lifts (strokes.ts).
// A wrong stroke fades and the model shows that stroke again in the writing box.
// Tap alternative (CLAUDE.md): a tap on the start dot, then a tap where the stroke
// ends, also completes it: it still shows where to start and which way to go.

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useApp } from '../../app/AppContext.tsx';
import type { Level, Round } from '../../engine/types.ts';
import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { ReplayIcon } from '../../ui/Icons.tsx';
import { graphemeItemId, makeAnswer } from '../answer.ts';
import { Hand, useDemo, useOpensWithInstruction } from '../shared/demo.tsx';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { TOLERANCE, TRACE_ID, type TraceItem } from './generate.ts';
import { checkStroke, pathLength, samplePath, strokesOf, type Point } from './strokes.ts';

const STROKE_MS = 900;
const TAP_UNITS = 4;
const TAP_RADIUS = 12;
const GHOST: Record<Level, number> = { 1: 0.45, 2: 0.2, 3: 0 };

/** Draws the given strokes one after the other, again whenever `run` changes. */
function useStrokeAnimation(count: number, run: number) {
  const refs = useRef<(SVGPathElement | null)[]>([]);
  useEffect(() => {
    let frame = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const elapsed = now - t0;
      refs.current.forEach((p, i) => {
        if (p) p.style.strokeDashoffset = String(1 - Math.min(1, Math.max(0, (elapsed - i * STROKE_MS) / STROKE_MS)));
      });
      if (elapsed < count * STROKE_MS) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [count, run]);
  return refs;
}

const startOf = (d: string): Point => samplePath(d)[0]!;
const endOf = (d: string): Point => samplePath(d).at(-1)!;
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) <= TAP_RADIUS;

export function Trace({ round, onAnswer, onComplete }: ExerciseProps) {
  const r = round as Round;
  const items = r.items as TraceItem[];
  const level = r.level;
  const audio = useRoundAudio();
  const demo = useDemo();
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(0);
  const [drawing, setDrawing] = useState<Point[]>([]);
  const points = useRef<Point[]>([]);
  const [fading, setFading] = useState<Point[] | null>(null);
  const [armed, setArmed] = useState(false);
  const [modelRun, setModelRun] = useState(0);
  const [hintRun, setHintRun] = useState<number | null>(null);
  const mistake = useRef(false);
  const shownAt = useRef(Date.now());
  const busy = useRef(false);
  const svg = useRef<SVGSVGElement>(null);
  const { settings } = useApp();
  const shown = items[index]!;
  // the left-handed sheet when the parent set «αριστερόχειρας»
  const item = useMemo(() => ({ ...shown, strokes: strokesOf(shown.letter, shown.letterCase, settings.leftHanded) ?? [] }), [shown, settings.leftHanded]);
  const models = useMemo(() => item.strokes.map(samplePath), [item]);
  const withInstruction = useOpensWithInstruction(index);
  const modelRefs = useStrokeAnimation(item.strokes.length, modelRun + index * 1000);
  const hintRefs = useStrokeAnimation(1, hintRun ?? -1);

  useEffect(() => {
    shownAt.current = Date.now();
    if (withInstruction) void audio.instruction(TRACE_ID);
    return () => audio.stop();
  }, [index, audio, withInstruction]);

  const log = (correct: boolean, attempt: 1 | 2, given: string) =>
    onAnswer(
      makeAnswer(round, {
        itemId: graphemeItemId(item.target),
        target: item.letter,
        given,
        correct,
        attempt,
        position: index,
        latencyMs: Date.now() - shownAt.current,
      }),
    );

  const toBox = (e: PointerEvent): Point | null => {
    const el = svg.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const strokeDone = () => {
    setArmed(false);
    const next = done + 1;
    setDone(next);
    if (next < item.strokes.length) return;
    log(true, mistake.current ? 2 : 1, item.letter);
    busy.current = true;
    void audio.praiseThen(() => {
      busy.current = false;
      if (index + 1 >= items.length) return onComplete();
      mistake.current = false;
      setDone(0);
      setHintRun(null);
      setIndex(index + 1);
    });
  };

  const wrong = (verdict: string, traced: Point[]) => {
    if (!mistake.current) log(false, 1, verdict);
    mistake.current = true;
    setArmed(false);
    setFading(traced);
    setTimeout(() => setFading(null), 700);
    setHintRun(Date.now());
  };

  const finish = (traced: Point[]) => {
    const current = item.strokes[done];
    if (!current) return;
    if (pathLength(traced) < TAP_UNITS) {
      const at = traced[0]!;
      if (!armed && near(at, startOf(current))) return setArmed(true);
      if (armed && near(at, endOf(current))) return strokeDone();
      return wrong('tap', traced);
    }
    const verdict = checkStroke(traced, models[done]!, TOLERANCE[level]);
    if (verdict === 'ok') strokeDone();
    else wrong(verdict, traced);
  };

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (busy.current || done >= item.strokes.length) return;
    const p = toBox(e);
    if (!p) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // a pointer the browser does not track (synthetic events): moves still arrive over the box
    }
    points.current = [p];
    setDrawing(points.current);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (points.current.length === 0) return;
    const p = toBox(e);
    if (!p) return;
    points.current = [...points.current, p];
    setDrawing(points.current);
  };
  // the points live in a ref: a quick tap lifts before React has rendered the touch
  const onUp = () => {
    const traced = points.current;
    if (traced.length === 0) return;
    points.current = [];
    setDrawing([]);
    finish(traced);
  };

  const current = item.strokes[done];
  const startDot = current ? startOf(current) : null;
  const endDot = current && armed ? endOf(current) : null;
  const line = (pts: Point[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="exercise-stage trace">
      <div className="prompt">
        <svg className="trace-model" viewBox="0 0 100 100" aria-label={item.letter}>
          {item.strokes.map((d, i) => (
            <path key={`g${i}`} className="trace-ghost" d={d} />
          ))}
          {item.strokes.map((d, i) => (
            <path
              key={`${index}-${i}`}
              ref={(el) => {
                modelRefs.current[i] = el;
              }}
              className="trace-ink"
              d={d}
              pathLength={1}
            />
          ))}
        </svg>
        <IconButton label={t('exercise.trace.again')} onClick={() => setModelRun((n) => n + 1)}>
          <ReplayIcon />
        </IconButton>
      </div>

      <div className="trace-board">
        <svg ref={svg} viewBox="0 0 100 100" className="trace-pad" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          {item.letterCase === 'lower' && (
            <g className="trace-lines">
              <line x1="4" x2="96" y1="36" y2="36" />
              <line x1="4" x2="96" y1="70" y2="70" />
            </g>
          )}
          <g style={{ opacity: GHOST[level] }}>
            {item.strokes.map((d, i) => (
              <path key={i} className="trace-guide" d={d} />
            ))}
          </g>
          {item.strokes.slice(0, done).map((d, i) => (
            <path key={`done${i}`} className="trace-done" d={d} />
          ))}
          {hintRun !== null && current && (
            <path
              key={`hint${hintRun}`}
              ref={(el) => {
                hintRefs.current[0] = el;
              }}
              className="trace-hint"
              d={current}
              pathLength={1}
            />
          )}
          {fading && <polyline className="trace-user fading" points={line(fading)} />}
          {drawing.length > 0 && <polyline className="trace-user" points={line(drawing)} />}
          {startDot && (
            <g className={`trace-dot ${armed ? 'armed' : ''}`}>
              <circle cx={startDot.x} cy={startDot.y} r="5.5" />
              <text x={startDot.x} y={startDot.y + 3.6}>
                {done + 1}
              </text>
            </g>
          )}
          {endDot && <circle className="trace-end" cx={endDot.x} cy={endDot.y} r="5" />}
        </svg>
        {demo && startDot && (
          <span className="trace-hand" style={{ left: `${startDot.x}%`, top: `${startDot.y}%` }}>
            <Hand />
          </span>
        )}
      </div>
    </div>
  );
}
