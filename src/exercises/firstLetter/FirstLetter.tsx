import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { CheckIcon, SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { makeAnswer, wordItemId } from '../answer.ts';
import { Hand, useDemo } from '../shared/demo.tsx';
import { NEXT_ITEM_DELAY_MS, useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { FIRST_LETTER_ID, type FirstLetterItem } from './generate.ts';

export function FirstLetter({ round, onAnswer, onComplete }: ExerciseProps) {
  const items = round.items as FirstLetterItem[];
  const audio = useRoundAudio();
  const demo = useDemo();
  const [index, setIndex] = useState(0);
  const [faded, setFaded] = useState<string[]>([]);
  const [mistake, setMistake] = useState(false);
  const [solved, setSolved] = useState(false);
  const shownAt = useRef(Date.now());
  const item = items[index]!;

  useEffect(() => {
    let cancelled = false;
    shownAt.current = Date.now();
    (async () => {
      if (index === 0) await audio.instruction(FIRST_LETTER_ID);
      if (!cancelled) await audio.word(item.wordId, item.text);
    })();
    return () => {
      cancelled = true;
      audio.stop();
    };
  }, [index, item, audio]);

  const log = (given: string, correct: boolean, attempt: 1 | 2) =>
    onAnswer(
      makeAnswer(round, {
        itemId: wordItemId(item.wordId),
        target: item.target,
        given,
        correct,
        attempt,
        position: index,
        latencyMs: Date.now() - shownAt.current,
      }),
    );

  const pickOption = async (g: string) => {
    if (solved || faded.includes(g)) return;
    if (g === item.target) {
      log(g, true, mistake ? 2 : 1);
      setSolved(true);
      void audio.praise();
      setTimeout(() => {
        if (index + 1 >= items.length) return onComplete();
        setIndex(index + 1);
        setFaded([]);
        setMistake(false);
        setSolved(false);
      }, NEXT_ITEM_DELAY_MS);
      return;
    }
    if (!mistake) log(g, false, 1);
    setMistake(true);
    setFaded((f) => [...f, g]);
    // Hear it again, stressed: the first sound, then the word slowly («ννν-ερό»).
    await audio.phoneme(item.target);
    await audio.word(item.wordId, item.text, true);
  };

  return (
    <div className="exercise-stage first-letter">
      <div className="prompt">
        <Picture imageId={item.imageId} size={200} />
        <IconButton label={t('exercise.listen')} onClick={() => void audio.word(item.wordId, item.text)}>
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="choices">
        {item.options.map((g) => {
          const isTarget = g === item.target;
          const state = solved && isTarget ? 'correct' : faded.includes(g) ? 'faded' : mistake && isTarget ? 'hint' : '';
          return (
            <button key={g} type="button" className={`letter-tile ${state}`} onClick={() => void pickOption(g)} disabled={state === 'faded'}>
              <span className="letter">{g}</span>
              {state === 'correct' && (
                <span className="tile-badge">
                  <CheckIcon />
                </span>
              )}
              {demo && isTarget && !solved && <Hand />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
