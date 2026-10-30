// Shared "put the pieces in order" exercise (syllables, letters). Slots fill left to
// right; a wrong piece bounces back. Drag or tap (PRD §4).

import { useEffect, useRef, useState } from 'react';
import { wordsSoundSame } from '../../engine/homophones.ts';
import type { Round } from '../../engine/types.ts';
import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { CheckIcon, SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { makeAnswer, wordItemId } from '../answer.ts';
import type { ExerciseProps } from '../types.ts';
import { Hand, useDemo } from './demo.tsx';
import { useDragOrTap } from './useDragOrTap.ts';
import { NEXT_ITEM_DELAY_MS, useRoundAudio } from './useRoundAudio.ts';

export interface OrderTile {
  id: string;
  text: string;
}

export interface OrderItem {
  wordId: string;
  text: string;
  imageId: string;
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

export function OrderExercise({ round, onAnswer, onComplete, exerciseId, tileClass }: ExerciseProps & { exerciseId: string; tileClass: string }) {
  const items = (round as Round).items as OrderItem[];
  const audio = useRoundAudio();
  const demo = useDemo();
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<OrderTile[]>([]);
  const [shaking, setShaking] = useState<string | null>(null);
  const [mistake, setMistake] = useState(false);
  const usedListen = useRef(false);
  const shownAt = useRef(Date.now());
  const item = items[index]!;
  const solved = placed.length === item.parts.length;
  const expected = item.parts[placed.length];
  const unplaced = item.tiles.filter((tile) => !placed.includes(tile));
  const nextCorrect = expected === undefined ? undefined : unplaced.find((tile) => same(tile.text, expected));

  useEffect(() => {
    shownAt.current = Date.now();
    usedListen.current = false;
    // The instruction is heard; the pieces are reading material and are not.
    if (index === 0) void audio.instruction(exerciseId);
    return () => audio.stop();
  }, [index, audio, exerciseId]);

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
        usedListen: usedListen.current,
        latencyMs: Date.now() - shownAt.current,
      }),
    );

  const use = async (tile: OrderTile) => {
    if (solved || expected === undefined) return;
    if (!same(tile.text, expected)) {
      // «πώδι» for «πόδι»: right sound, wrong spelling gets its own gentle message
      const soundsRight = wordsSoundSame(tile.text, expected);
      if (!mistake) log([...placed.map((p) => p.text), tile.text].join(''), false, 1, soundsRight);
      setMistake(true);
      setShaking(tile.id);
      setTimeout(() => setShaking(null), 500);
      if (soundsRight) await audio.instruction('sounds-right');
      void audio.word(item.wordId, item.text, true);
      return;
    }
    const next = [...placed, tile];
    setPlaced(next);
    if (next.length < item.parts.length) return;

    log(item.text, true, mistake ? 2 : 1);
    void audio.praise();
    setTimeout(() => {
      if (index + 1 >= items.length) return onComplete();
      setIndex(index + 1);
      setPlaced([]);
      setMistake(false);
    }, NEXT_ITEM_DELAY_MS);
  };

  return (
    <div className="exercise-stage order-exercise">
      <div className="prompt">
        <Picture imageId={item.imageId} size={180} />
        <IconButton
          label={t('exercise.listen')}
          onClick={() => {
            usedListen.current = true; // hearing the word is help on a reading exercise (PRD §4)
            void audio.word(item.wordId, item.text);
          }}
        >
          <SpeakerIcon />
        </IconButton>
      </div>

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
            className={`${tileClass} ${shaking === tile.id ? 'shake' : mistake && tile === nextCorrect ? 'hint' : ''}`}
            onUse={() => void use(tile)}
            showHand={demo && tile === nextCorrect}
          />
        ))}
      </div>
    </div>
  );
}
