// Tap every picture that has the syllable. Each tap says the picture's word, so
// the child checks the name they think of against the one meant. Feedback as in
// the other games (PRD §4): a wrong picture fades, its word and then the syllable
// are heard slowly, the pictures still to find glow and the child taps them.
// One answer per question: attempt 1 is right only with no wrong tap.

import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext.tsx';
import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { makeAnswer } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useDemo, useOpensWithInstruction } from '../shared/demo.tsx';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { FIND_ALL_ID, findAllItemId, type FindAllItem } from './generate.ts';

export function FindAll({ round, onAnswer, onComplete }: ExerciseProps) {
  const items = round.items as FindAllItem[];
  const audio = useRoundAudio();
  const { content } = useApp();
  const demo = useDemo();
  const [index, setIndex] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [faded, setFaded] = useState<string[]>([]);
  const [mistake, setMistake] = useState(false);
  const shownAt = useRef(Date.now());
  const item = items[index]!;
  const solved = item.answers.every((id) => found.includes(id));
  const withInstruction = useOpensWithInstruction(index);

  const wordOf = (id: string) => content.wordsById.get(id)!;
  const sayWord = (id: string, slow = false) => audio.word(id, wordOf(id).text, slow);

  useEffect(() => {
    shownAt.current = Date.now();
    const run = audio.sequence();
    (async () => {
      if (withInstruction) await audio.instruction(FIND_ALL_ID);
      if (run.alive()) await audio.syllable(item.target);
    })();
    return () => audio.stop();
  }, [index, item, audio, withInstruction]);

  const log = (given: string, correct: boolean, attempt: 1 | 2) =>
    onAnswer(
      makeAnswer(round, {
        itemId: findAllItemId(item),
        target: item.target,
        given,
        correct,
        attempt,
        position: index,
        latencyMs: Date.now() - shownAt.current,
      }),
    );

  const tap = async (id: string) => {
    if (solved || found.includes(id) || faded.includes(id)) return;
    audio.stop();
    const run = audio.sequence();
    if (item.answers.includes(id)) {
      const now = [...found, id];
      setFound(now);
      if (!item.answers.every((a) => now.includes(a))) {
        await sayWord(id);
        return;
      }
      log(now.join(','), true, mistake ? 2 : 1);
      await sayWord(id);
      if (!run.alive()) return;
      await audio.praiseThen(() => {
        if (index + 1 >= items.length) return onComplete();
        setIndex(index + 1);
        setFound([]);
        setFaded([]);
        setMistake(false);
      });
      return;
    }
    if (!mistake) log(id, false, 1);
    setMistake(true);
    setFaded((f) => [...f, id]);
    await sayWord(id, true);
    if (run.alive()) await audio.syllable(item.target, true);
  };

  const stateOf = (id: string) =>
    found.includes(id) ? 'correct' : faded.includes(id) ? 'faded' : mistake && item.answers.includes(id) ? 'hint' : '';
  const nextToFind = item.answers.find((id) => !found.includes(id));

  return (
    <div className="exercise-stage find-all">
      <div className="prompt">
        {/* one dot per picture to find, filled as they are found */}
        <div className="beats" aria-hidden>
          {item.answers.map((id, k) => (
            <span key={id} className={`beat ${k < found.length ? 'on' : ''}`} />
          ))}
        </div>
        <IconButton label={t('exercise.listen')} onClick={() => audio.replay(() => audio.syllable(item.target))}>
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className={`choices find-all-grid find-all-grid--${item.options.length}`}>
        {item.options.map((id) => (
          <ChoiceTile key={id} variant="picture" state={stateOf(id)} hand={demo && id === nextToFind} onPick={() => void tap(id)}>
            <Picture imageId={wordOf(id).imageId!} size={96} />
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
