// Shared "put the pieces in order" exercise (syllables, letters, words of a sentence). Slots fill left to
// right; a wrong piece bounces back. Drag or tap (PRD §4).

import { useEffect, useRef, useState } from 'react';
import { wordsSoundSame } from '../../engine/homophones.ts';
import type { Round } from '../../engine/types.ts';
import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { CheckIcon, SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { makeAnswer, sentenceItemId, wordItemId } from '../answer.ts';
import type { ExerciseProps } from '../types.ts';
import { Hand, useDemo, useOpensWithInstruction } from './demo.tsx';
import { useDragOrTap } from './useDragOrTap.ts';
import { useRoundAudio } from './useRoundAudio.ts';

export interface OrderTile {
  id: string;
  text: string;
}

export interface OrderItem {
  wordId: string;
  /** set when the pieces are the words of a sentence: then it is logged and heard as one */
  sentenceId?: string;
  text: string;
  /** none for pieces that are not a word (letters in alphabetical order) */
  imageId?: string;
  /** review-queue key when the item is neither a word nor a sentence */
  itemId?: string;
  /** the pieces in the right order, as shown */
  parts: string[];
  tiles: OrderTile[];
}

const same = (a: string, b: string) => a.toLocaleLowerCase('el') === b.toLocaleLowerCase('el');

function Tile({ tile, className, onUse, showHand }: { tile: OrderTile; className: string; onUse(): void; showHand: boolean }) {
  const drag = useDragOrTap(onUse, '.slots');
  return (
    <button
      type="button"
      className={className}
      style={drag.style}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onUse()}
    >
      {tile.text}
      {showHand && <Hand />}
    </button>
  );
}

export function OrderExercise({
  round,
  onAnswer,
  onComplete,
  exerciseId,
  tileClass,
  stageClass = '',
}: ExerciseProps & { exerciseId: string; tileClass: string; stageClass?: string }) {
  const items = (round as Round).items as OrderItem[];
  const audio = useRoundAudio();
  const demo = useDemo();
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<OrderTile[]>([]);
  const [shaking, setShaking] = useState<string | null>(null);
  const [mistake, setMistake] = useState(false);
  // after a mistake only the next right piece glows; the child tries the ones after it alone
  const [hinting, setHinting] = useState(false);
  const usedListen = useRef(false);
  const shownAt = useRef(Date.now());
  const item = items[index]!;
  const solved = placed.length === item.parts.length;
  const expected = item.parts[placed.length];
  const unplaced = item.tiles.filter((tile) => !placed.includes(tile));
  const nextCorrect = expected === undefined ? undefined : unplaced.find((tile) => same(tile.text, expected));

  const withInstruction = useOpensWithInstruction(index);
  // letters in alphabetical order are not a word: nothing to hear
  const voiced = Boolean(item.sentenceId || item.wordId);
  const say = async (slow = false) => {
    if (item.sentenceId) await audio.sentence(item.sentenceId, item.text, slow);
    else if (item.wordId) await audio.word(item.wordId, item.text, slow);
  };
  const sep = item.sentenceId ? ' ' : '';

  useEffect(() => {
    shownAt.current = Date.now();
    usedListen.current = false;
    // The instruction is heard; the pieces are reading material and are not.
    if (withInstruction) void audio.instruction(exerciseId);
    return () => audio.stop();
  }, [index, audio, exerciseId, withInstruction]);

  const log = (given: string, correct: boolean, attempt: 1 | 2, soundsRight = false) =>
    onAnswer(
      makeAnswer(round, {
        itemId: item.itemId ?? (item.sentenceId ? sentenceItemId(item.sentenceId) : wordItemId(item.wordId)),
        target: item.text,
        given,
        correct,
        attempt,
        position: index,
        soundsRight,
        usedListen: usedListen.current,
        latencyMs: Date.now() - shownAt.current,
      }),
    );

  const use = async (tile: OrderTile) => {
    if (solved || expected === undefined) return;
    if (!same(tile.text, expected)) {
      // «πώδι» for «πόδι»: right sound, wrong spelling gets its own gentle message
      const soundsRight = voiced && wordsSoundSame(tile.text, expected);
      if (!mistake) log([...placed.map((p) => p.text), tile.text].join(sep), false, 1, soundsRight);
      setMistake(true);
      setHinting(true);
      setShaking(tile.id);
      setTimeout(() => setShaking(null), 500);
      audio.stop();
      const run = audio.sequence();
      if (soundsRight) await audio.instruction('sounds-right');
      if (run.alive()) void say(true);
      return;
    }
    const next = [...placed, tile];
    setPlaced(next);
    setHinting(false);
    if (next.length < item.parts.length) return;

    log(item.text, true, mistake ? 2 : 1);
    await audio.praiseThen(() => {
      if (index + 1 >= items.length) return onComplete();
      setIndex(index + 1);
      setPlaced([]);
      setMistake(false);
    });
  };

  return (
    <div className={`exercise-stage order-exercise ${stageClass}`}>
      {(item.imageId || voiced) && (
        <div className="prompt">
          {item.imageId && <Picture imageId={item.imageId} size={180} />}
          {voiced && (
            <IconButton
              label={t('exercise.listen')}
              onClick={() => {
                usedListen.current = true; // hearing the word is help on a reading exercise (PRD §4)
                audio.replay(() => say());
              }}
            >
              <SpeakerIcon />
            </IconButton>
          )}
        </div>
      )}

      <div className={`slots ${solved ? 'correct' : ''}`}>
        {item.parts.map((_, k) => (
          <div key={k} className={`slot ${tileClass}-slot ${k === placed.length ? 'next' : ''}`}>
            {placed[k]?.text}
          </div>
        ))}
        {solved && (
          <span className="tile-badge">
            <CheckIcon />
          </span>
        )}
      </div>

      <div className="tiles">
        {unplaced.map((tile) => (
          <Tile
            key={tile.id}
            tile={tile}
            className={`${tileClass} ${shaking === tile.id ? 'shake' : hinting && tile === nextCorrect ? 'hint' : ''}`}
            onUse={() => void use(tile)}
            showHand={demo && tile === nextCorrect}
          />
        ))}
      </div>
    </div>
  );
}
