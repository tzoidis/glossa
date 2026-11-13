// Generates one round of an exercise and records every answer. The first time an
// exercise type is played, one practice question with the demo hand comes first
// and does not count (PRD §4).

import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { buildGenerateContext } from '../app/generateContext.ts';
import { firstAttemptShare } from '../engine/adaptive.ts';
import { newSeed } from '../engine/rng.ts';
import type { AnswerLog, Level, Round } from '../engine/types.ts';
import { findExercise } from '../exercises/registry.ts';
import { DemoProvider, InstructionHeard } from '../exercises/shared/demo.tsx';
import { completeRound, dueReviewKeys, recentWordIds, recordAnswer } from '../storage/progress.ts';
import { RoundBar } from './RoundBar.tsx';

/** what a question is about: its word, or its target for questions without one (a syllable) */
const wordIdOfItem = (item: unknown) => {
  const i = item as { wordId?: string; target?: unknown };
  return i.wordId ?? String(i.target ?? '');
};

/** memory logs one answer per pair, not per board: no pebbles there */
const NO_PEBBLES = new Set(['upper-lower']);

export function RoundPlayer({ exerciseId, onComplete, onLeave }: { exerciseId: string; onComplete(): void; onLeave(): void }) {
  const app = useApp();
  const { db, child } = app;
  const entry = findExercise(exerciseId);
  const [round, setRound] = useState<Round | null>(null);
  const [practice, setPractice] = useState<Round | null>(null);
  const [demoDone, setDemoDone] = useState(() => app.settings.seenDemos.includes(exerciseId));
  const demoShown = useRef(!demoDone);
  const finished = useRef(false);
  const answers = useRef<AnswerLog[]>([]);
  // questions solved so far: one right answer ends each question
  const [solved, setSolved] = useState(0);

  useEffect(() => {
    if (!entry) return;
    let cancelled = false;
    (async () => {
      const seed = newSeed();
      const inputs = {
        content: app.content,
        allow: app.allow,
        recentWordIds: await recentWordIds(db, child.id),
        reviewQueue: await dueReviewKeys(db, child.id, child.roundsPlayed),
      };
      try {
        // the child's level for this exercise; a lower one if the words run short there
        let r: Round | undefined;
        for (let level: number = child.levels?.[exerciseId]?.level ?? 1; !r; level--) {
          try {
            r = entry.module.generate(buildGenerateContext({ ...inputs, level: level as Level, seed }));
          } catch (e) {
            if (level === 1) throw e;
          }
        }
        if (!cancelled) setRound({ ...r, seed });
        if (!demoDone) {
          // practice on a word the real round does not use, if there is one; always at level 1
          const used = new Set(r.items.map(wordIdOfItem));
          const extra = entry.module.generate(buildGenerateContext({ ...inputs, level: 1, recentWordIds: [...used], seed: seed ^ 0x9e3779b9 }));
          const first = wordIdOfItem(r.items[0]);
          const item =
            extra.items.find((i) => !used.has(wordIdOfItem(i))) ?? // a word the round does not use
            extra.items.find((i) => wordIdOfItem(i) !== first) ?? // at least not the round's first question
            r.items[0];
          if (!cancelled) setPractice({ ...extra, id: `${extra.id}-demo`, items: [item] });
        }
      } catch (e) {
        // not enough content right now: skip the round (no star), never show a locked word
        console.error(`generate ${exerciseId} seed=${seed}`, e);
        if (!cancelled) onComplete();
      }
    })();
    return () => {
      cancelled = true;
    };
    // generate once per mounted round (Session remounts per round via key)
  }, []);

  if (!entry) return null;
  const bar = (inDemo: boolean) => (
    <RoundBar exerciseId={exerciseId} total={inDemo || !round || NO_PEBBLES.has(exerciseId) ? null : round.items.length} done={solved} onLeave={onLeave} />
  );
  if (!round) return <div className="exercise-stage" />;
  const { Component } = entry.module;

  if (!demoDone) {
    if (!practice) return <div className="exercise-stage" />;
    const finishDemo = async () => {
      await db.settings.update(child.id, { seenDemos: [...app.settings.seenDemos, exerciseId] });
      await app.refresh();
      setDemoDone(true);
    };
    return (
      <>
        {bar(true)}
        <DemoProvider>
          <Component key="demo" round={practice} onAnswer={() => {}} onComplete={() => void finishDemo()} />
        </DemoProvider>
      </>
    );
  }

  const onAnswer = (a: AnswerLog) => {
    answers.current.push(a);
    if (a.correct) setSolved((n) => n + 1);
    void recordAnswer(db, { ...a, childId: child.id }, child.roundsPlayed).catch((e) => console.error('recordAnswer', e));
  };

  const complete = () => {
    if (finished.current) return;
    finished.current = true;
    void completeRound(db, child.id, { exerciseId, share: firstAttemptShare(answers.current) })
      .then(() => app.refresh())
      .finally(onComplete);
  };

  const real = <Component key="round" round={round} onAnswer={onAnswer} onComplete={complete} />;
  // the demo just played the instruction: do not repeat it
  return (
    <>
      {bar(false)}
      {demoShown.current ? <InstructionHeard>{real}</InstructionHeard> : real}
    </>
  );
}
