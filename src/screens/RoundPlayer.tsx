// Generates one round of an exercise and records every answer.

import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { buildGenerateContext } from '../app/generateContext.ts';
import { newSeed } from '../engine/rng.ts';
import type { AnswerLog, Round } from '../engine/types.ts';
import { findExercise } from '../exercises/registry.ts';
import { completeRound, dueReviewKeys, recentWordIds, recordAnswer } from '../storage/progress.ts';

export function RoundPlayer({ exerciseId, onComplete }: { exerciseId: string; onComplete(): void }) {
  const app = useApp();
  const { db, child } = app;
  const entry = findExercise(exerciseId);
  const [round, setRound] = useState<Round | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (!entry) return;
    let cancelled = false;
    (async () => {
      const seed = newSeed();
      const ctx = buildGenerateContext({
        content: app.content,
        allow: app.allow,
        level: 1,
        recentWordIds: await recentWordIds(db, child.id),
        reviewQueue: await dueReviewKeys(db, child.id, child.roundsPlayed),
        seed,
      });
      try {
        const r = entry.module.generate(ctx);
        if (!cancelled) setRound({ ...r, seed });
      } catch (e) {
        // not enough content for this exercise right now: skip the round, never show a locked word
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

  const { Component } = entry.module;
  return <Component round={round} onAnswer={onAnswer} onComplete={complete} />;
}
