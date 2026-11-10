// The dictation board: picture and heard word on top, one box per letter, and a
// keyboard of the taught letters. The word is checked once every box is full.
// A mistake keeps the right beginning, clears the rest and replays the word
// slowly; from then on the next right key glows and a wrong key only shakes
// (PRD §4: the child always makes the right move). A spelling that sounds right
// («πώδι») gets the gentle «sounds right» message instead.

import { useEffect, useRef, useState } from 'react';
import greek from '../../content/greek.json' with { type: 'json' };
import { wordsSoundSame } from '../../engine/homophones.ts';
import type { Round } from '../../engine/types.ts';
import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { BackspaceIcon, CheckIcon, SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { makeAnswer, wordItemId } from '../answer.ts';
import { Hand, useDemo, useOpensWithInstruction } from '../shared/demo.tsx';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { DICTATION_ID, type DictationItem } from './generate.ts';

/** what the boxes show: a σ at the end of the word is written ς */
const shown = (letters: string[], k: number, total: number) => (letters[k] === greek.sigma && k === total - 1 ? greek.finalSigma : letters[k]);

export function Dictation({ round, onAnswer, onComplete }: ExerciseProps) {
  const items = (round as Round).items as DictationItem[];
  const audio = useRoundAudio();
  const demo = useDemo();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState<string[]>([]);
  const [mistake, setMistake] = useState(false);
  const [shaking, setShaking] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const shownAt = useRef(Date.now());
  const busy = useRef(false);
  const item = items[index]!;
  const total = item.letters.length;
  const withInstruction = useOpensWithInstruction(index);
  // after a mistake (and in the demo) the next right key is shown
  const nextKey = mistake || demo ? item.letters[typed.length] : undefined;

  useEffect(() => {
    shownAt.current = Date.now();
    const run = audio.sequence();
    (async () => {
      if (withInstruction) await audio.instruction(DICTATION_ID);
      if (run.alive()) await audio.word(item.wordId, item.text);
    })();
    return () => audio.stop();
  }, [index, item, audio, withInstruction]);

  const log = (given: string, correct: boolean, attempt: 1 | 2, soundsRight = false) =>
    onAnswer(
      makeAnswer(round, {
        itemId: wordItemId(item.wordId),
        target: item.text,
        given,
        correct,
        attempt,
        position: index,
        soundsRight,
        latencyMs: Date.now() - shownAt.current,
      }),
    );

  const finish = () => {
    setSolved(true);
    log(item.text, true, mistake ? 2 : 1);
    busy.current = true;
    void audio.praiseThen(() => {
      busy.current = false;
      if (index + 1 >= items.length) return onComplete();
      setTyped([]);
      setMistake(false);
      setSolved(false);
      setIndex(index + 1);
    });
  };

  const press = async (key: string) => {
    if (busy.current || solved || typed.length >= total) return;
    // once guided, a wrong key only shakes: the right one glows
    if (nextKey !== undefined && key !== nextKey) {
      setShaking(key);
      setTimeout(() => setShaking(null), 500);
      return;
    }
    const next = [...typed, key];
    setTyped(next);
    if (next.length < total) return;
    if (next.join('') === item.letters.join('')) return finish();

    // a full word with a mistake: keep the right beginning, replay the word slowly
    const given = next.join('');
    const soundsRight = wordsSoundSame(given, item.letters.join(''));
    log(given, false, 1, soundsRight);
    setMistake(true);
    let keep = 0;
    while (next[keep] === item.letters[keep]) keep++;
    busy.current = true;
    setTimeout(async () => {
      setTyped(next.slice(0, keep));
      busy.current = false;
      const run = audio.sequence();
      if (soundsRight) await audio.instruction('sounds-right');
      if (run.alive()) void audio.word(item.wordId, item.text, true);
    }, 700);
  };

  const erase = () => {
    if (busy.current || solved || mistake) return;
    setTyped(typed.slice(0, -1));
  };

  return (
    <div className="exercise-stage dictation">
      <div className="prompt">
        <Picture imageId={item.imageId} size={140} />
        <IconButton label={t('exercise.listen')} onClick={() => audio.replay(() => audio.word(item.wordId, item.text))}>
          <SpeakerIcon />
        </IconButton>
      </div>

      <div className={`slots dictation-slots ${solved ? 'correct' : ''}`}>
        {solved ? (
          <span className="dictation-word">{item.text}</span>
        ) : (
          item.letters.map((_, k) => (
            <div key={k} className={`slot dictation-slot ${k === typed.length ? 'next' : ''}`}>
              {k < typed.length ? shown(typed, k, total) : ''}
            </div>
          ))
        )}
        {solved && (
          <span className="tile-badge">
            <CheckIcon />
          </span>
        )}
      </div>

      <div className="keyboard">
        {item.keys.map((key) => (
          <button
            key={key}
            type="button"
            className={`key ${shaking === key ? 'shake' : ''} ${nextKey === key ? 'hint' : ''}`}
            onClick={() => void press(key)}
          >
            {key}
            {demo && nextKey === key && <Hand />}
          </button>
        ))}
        <button type="button" className="key key--erase" aria-label={t('exercise.dictation.erase')} onClick={erase} disabled={mistake || typed.length === 0}>
          <BackspaceIcon />
        </button>
      </div>
    </div>
  );
}
