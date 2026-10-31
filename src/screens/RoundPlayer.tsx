// Generates one round of an exercise and records every answer. The first time an
// exercise type is played, one practice question with the demo hand comes first
// and does not count (PRD §4).

import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { buildGenerateContext } from '../app/generateContext.ts';
import { newSeed } from '../engine/rng.ts';
import type { AnswerLog, Round } from '../engine/types.ts';
import { findExercise } from '../exercises/registry.ts';
import { DemoProvider, InstructionHeard } from '../exercises/shared/demo.tsx';
import { completeRound, dueReviewKeys, recentWordIds, recordAnswer } from '../storage/progress.ts';

/** what a question is about: its word, or its target for questions without one (a syllable) */
const wordIdOfItem = (item: unknown) => {
  const i = item as { wordId?: string; target?: unknown };
  return i.wordId ?? String(i.target ?? '');
};

export function RoundPlayer({ exerciseId, onComplete }: { exerciseId: string; onComplete(): void }) {
  const app = useApp();
  const { db, child } = app;
  const entry = findExercise(exerciseId);
  const [round, setRound] = useState<Round | null>(null);
  const [practice, setPractice] = useState<Round | null>(null);
  const [demoDone, setDemoDone] = useState(() => app.settings.seenDemos.includes(exerciseId));
  const demoShown = useRef(!demoDone);
  const finished = useRef(false);

  useEffect(() => {
    if (!entry) return;
    let cancelled = false;
    (async () => {
      const seed = newSeed();
      const inputs = {
        content: app.content,
        allow: app.allow,
        level: 1 as const,
        recentWordIds: await recentWordIds(db, child.id),
        reviewQueue: await dueReviewKeys(db, child.id, child.roundsPlayed),
      };
      try {
        const r = entry.module.generate(buildGenerateContext({ ...inputs, seed }));
        if (!cancelled) setRound({ ...r, seed });
        if (!demoDone) {
          // practice on a word the real round does not use, if there is one
          const used = new Set(r.items.map(wordIdOfItem));
          const extra = entry.module.generate(buildGenerateContext({ ...inputs, recentWordIds: [...used], seed: seed ^ 0x9e3779b9 }));
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
      <DemoProvider>
        <Component key="demo" round={practice} onAnswer={() => {}} onComplete={() => void finishDemo()} />
      </DemoProvider>
    );
  }

  const onAnswer = (a: AnswerLog) => {
    void recordAnswer(db, { ...a, childId: child.id }, child.roundsPlayed).catch((e) => console.error('recordAnswer', e));
  };

  const complete = () => {
    if (finished.current) return;
    finished.current = true;
    void completeRound(db, child.id)
      .then(() => app.refresh())
      .finally(onComplete);
  };

  const real = <Component key="round" round={round} onAnswer={onAnswer} onComplete={complete} />;
  // the demo just played the instruction: do not repeat it
  return demoShown.current ? <InstructionHeard>{real}</InstructionHeard> : real;
}
