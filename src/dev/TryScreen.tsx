// Development only: plays one game at one letter and level, so a change can be checked
// in the browser (or on the tablet with `npm run dev:lan`) without playing through a
// session. Open with ?try=<exercise id>&pos=<letters taught>&level=1|2|3[&seed=n];
// ?try alone lists every game; &demo shows the first-time demo. ?try=screen:<name> shows a screen around the games.
// Not in the production build (App imports it only in dev). Answers are not stored.

import { useMemo, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { CONTENT } from '../app/content.ts';
import { buildGenerateContext } from '../app/generateContext.ts';
import { makeContext } from '../engine/allowedWords.ts';
import type { Level, Round } from '../engine/types.ts';
import { NotEnoughContent } from '../exercises/pool.ts';
import { EXERCISES, findExercise } from '../exercises/registry.ts';
import { DemoProvider } from '../exercises/shared/demo.tsx';
import { BreakView } from '../screens/BreakView.tsx';
import { Home } from '../screens/Home.tsx';
import { LetterReturn } from '../screens/LetterReturn.tsx';
import { RoundBar, type Reaction } from '../screens/RoundBar.tsx';
import { Start } from '../screens/Start.tsx';
import { Village } from '../screens/Village.tsx';

const none = () => undefined;
const TRY_ORDER = CONTENT.order.order;

/** The screens around the games, as ?try=screen:<name>. */
const SCREENS: Record<string, () => React.ReactNode> = {
  start: () => <Start onGo={none} onParent={none} />,
  home: () => <Home onPlay={none} onVillage={none} onParent={none} />,
  letters: () => <LetterReturn letters={TRY_ORDER.slice(10, 13)} onDone={none} />,
  letter: () => <LetterReturn letters={TRY_ORDER.slice(17, 18)} onDone={none} />,
  village: () => <Village onHome={none} />,
  break: () => (
    <main className="screen screen--center">
      <BreakView onContinue={none} />
    </main>
  ),
};

export interface TryRequest {
  id: string;
  pos: number | null;
  level: Level;
  seed: number;
  /** &demo: the first-time demo, with the hand */
  demo: boolean;
}

/** The game, letter and level asked for in the address, if it asks for one. */
export function tryRequest(search: string): TryRequest | null {
  const params = new URLSearchParams(search);
  const id = params.get('try');
  if (id === null) return null;
  const num = (k: string) => (params.has(k) && Number.isFinite(Number(params.get(k))) ? Number(params.get(k)) : null);
  const level = num('level');
  return { id, pos: num('pos'), level: (level === 2 || level === 3 ? level : 1) as Level, seed: num('seed') ?? Math.floor(Math.random() * 1e9), demo: params.has('demo') };
}

const link = (q: Record<string, string>) => '?' + new URLSearchParams(q).toString();

export default function TryScreen({ search }: { search: string }) {
  const request = tryRequest(search)!;
  const { content, settings } = useApp();
  const [seed, setSeed] = useState(request.seed);
  const [done, setDone] = useState(0);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const pos = request.pos ?? settings.upToPosition;
  const entry = findExercise(request.id);

  const result = useMemo((): Round | string | null => {
    if (!entry) return null;
    const allow = makeContext(content.curriculum, { position: pos }, content.words);
    // as the stations would: a game whose unit has not come yet is not offered
    const { skills, minGraphemes } = entry.module.requires;
    const missing = skills.filter((s) => !allow.skills.has(s));
    if (missing.length || minGraphemes > pos) return `not offered yet at pos=${pos}: needs ${[...missing, minGraphemes > pos ? `${minGraphemes} letters` : ''].filter(Boolean).join(', ')}`;
    try {
      return entry.module.generate(buildGenerateContext({ content, allow, level: request.level, recentWordIds: [], reviewQueue: [], seed, names: entry.names }));
    } catch (e) {
      if (e instanceof NotEnoughContent) return `not enough content at pos=${pos}: ${e.message}`;
      throw e;
    }
  }, [entry, content, pos, request.level, seed]);

  const screen = request.id.startsWith('screen:') ? SCREENS[request.id.slice('screen:'.length)] : undefined;
  if (screen) return <>{screen()}</>;

  if (!entry) {
    return (
      <main className="screen dev-try-list">
        <p>
          pos={pos} (max {content.order.maxPosition}) · screens:{' '}
          {Object.keys(SCREENS).map((s) => (
            <a key={s} href={link({ try: `screen:${s}` })} style={{ marginRight: 12 }}>
              {s}
            </a>
          ))}
        </p>
        <ul>
          {EXERCISES.map((e) => (
            <li key={e.module.id}>
              {e.module.id}:{' '}
              {[1, 2, 3].map((level) => (
                <a key={level} href={link({ try: e.module.id, pos: String(pos), level: String(level) })} style={{ marginRight: 12 }}>
                  level {level}
                </a>
              ))}
            </li>
          ))}
        </ul>
      </main>
    );
  }

  if (typeof result === 'string' || result === null) return <main className="screen">{result}</main>;
  const { Component } = entry.module;
  const again = () => {
    setDone(0);
    setReaction(null);
    setSeed(seed + 1);
  };
  return (
    <main className="screen session">
      <RoundBar exerciseId={entry.module.id} total={result.items.length} done={done} reaction={reaction} onLeave={again} />
      {request.demo ? (
        <DemoProvider>
          <Component key={seed} round={result} onAnswer={none} onComplete={again} />
        </DemoProvider>
      ) : (
        <Component
          key={seed}
          round={result}
          onAnswer={(a) => {
            if (a.correct) setDone((n) => n + 1);
            setReaction((r) => ({ right: a.correct, n: (r?.n ?? 0) + 1 }));
          }}
          onComplete={again}
        />
      )}
      <p className="dev-try-seed" style={{ position: 'fixed', left: 4, bottom: 0, margin: 0, fontSize: 11, opacity: 0.6, pointerEvents: 'none' }}>
        {entry.module.id} pos={pos} level={request.level} seed={seed}
      </p>
    </main>
  );
}
