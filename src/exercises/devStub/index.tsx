// Dev-only placeholder so the session flow can be tried before M4.
// Not registered in production builds.

import { useState } from 'react';
import { pick } from '../../engine/rng.ts';
import { Picture } from '../../ui/Picture.tsx';
import { IconButton } from '../../ui/IconButton.tsx';
import { CheckIcon } from '../../ui/Icons.tsx';
import { makeAnswer, wordItemId } from '../answer.ts';
import type { ExerciseModule, ExerciseProps } from '../types.ts';

interface Item {
  wordId: string;
  imageId: string;
}

function DevStub({ round, onAnswer, onComplete }: ExerciseProps) {
  const items = round.items as Item[];
  const [i, setI] = useState(0);
  const item = items[i];
  if (!item) return null;

  const next = () => {
    onAnswer(makeAnswer(round, { itemId: wordItemId(item.wordId), target: item.wordId, given: item.wordId, correct: true, attempt: 1, position: i }));
    if (i + 1 >= items.length) onComplete();
    else setI(i + 1);
  };

  return (
    <div className="exercise-stage">
      <Picture imageId={item.imageId} size={200} />
      <IconButton label="ok" onClick={next} variant="primary">
        <CheckIcon />
      </IconButton>
    </div>
  );
}

export const devStub: ExerciseModule = {
  id: 'dev-stub',
  requires: { skills: [], minGraphemes: 0, needs: ['image'] },
  generate(ctx) {
    const pool = ctx.wordPool.filter((w) => w.imageId && !ctx.recentWordIds.includes(w.id));
    const source = pool.length >= 5 ? pool : ctx.wordPool.filter((w) => w.imageId);
    const items: Item[] = Array.from({ length: 5 }, () => {
      const w = pick(source, ctx.rng);
      return { wordId: w.id, imageId: w.imageId! };
    });
    return { id: `dev-stub-${ctx.rng()}`, exerciseId: 'dev-stub', seed: 0, level: ctx.level, items };
  },
  Component: DevStub,
};
