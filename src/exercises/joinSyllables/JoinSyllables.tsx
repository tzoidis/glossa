import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { CheckIcon, SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { makeAnswer, wordItemId } from '../answer.ts';
import { Hand, useDemo } from '../shared/demo.tsx';
import { useDragOrTap } from '../shared/useDragOrTap.ts';
import { NEXT_ITEM_DELAY_MS, useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { JOIN_SYLLABLES_ID, type JoinSyllablesItem, type SyllableTile } from './generate.ts';

const same = (a: string, b: string) => a.toLocaleLowerCase('el') === b.toLocaleLowerCase('el');

function Tile({ tile, state, onUse, showHand }: { tile: SyllableTile; state: string; onUse(): void; showHand: boolean }) {
  const drag = useDragOrTap(onUse, '.slots');
  return (
    <button
      type="button"
      className={`syllable-tile ${state}`}
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

export function JoinSyllables({ round, onAnswer, onComplete }: ExerciseProps) {
  const items = round.items as JoinSyllablesItem[];
  const audio = useRoundAudio();
  const demo = useDemo();
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<SyllableTile[]>([]);
  const [shaking, setShaking] = useState<string | null>(null);
  const [mistake, setMistake] = useState(false);
  const [usedListen, setUsedListen] = useState(false);
  const shownAt = useRef(Date.now());
  const item = items[index]!;
  const solved = placed.length === item.syllables.length;
  const expected = item.syllables[placed.length];
  const unplaced = item.tiles.filter((tile) => !placed.includes(tile));
  const nextCorrect = expected === undefined ? undefined : unplaced.find((tile) => same(tile.text, expected));

  useEffect(() => {
    shownAt.current = Date.now();
    // The instruction is heard; the syllables are reading material and are not.
    if (index === 0) void audio.instruction(JOIN_SYLLABLES_ID);
    return () => audio.stop();
  }, [index, audio]);

  const log = (given: string, correct: boolean, attempt: 1 | 2) =>
    onAnswer(
      makeAnswer(round, {
        itemId: wordItemId(item.wordId),
        target: item.text,
        given,
        correct,
        attempt,
        position: index,
        usedListen,
        latencyMs: Date.now() - shownAt.current,
      }),
    );

  const use = (tile: SyllableTile) => {
    if (solved || expected === undefined) return;
    if (!same(tile.text, expected)) {
      if (!mistake) log([...placed.map((p) => p.text), tile.text].join(''), false, 1);
      setMistake(true);
      setShaking(tile.id);
      setTimeout(() => setShaking(null), 500);
      void audio.word(item.wordId, item.text, true);
      return;
    }
    const next = [...placed, tile];
    setPlaced(next);
    if (next.length < item.syllables.length) return;

    log(item.text, true, mistake ? 2 : 1);
    void audio.praise();
    setTimeout(() => {
      if (index + 1 >= items.length) return onComplete();
      setIndex(index + 1);
      setPlaced([]);
      setMistake(false);
      setUsedListen(false);
    }, NEXT_ITEM_DELAY_MS);
  };

  return (
    <div className="exercise-stage join-syllables">
      <div className="prompt">
        <Picture imageId={item.imageId} size={180} />
        <IconButton
          label={t('exercise.listen')}
          onClick={() => {
            setUsedListen(true); // hearing the word is help on a reading exercise (PRD §4)
            void audio.word(item.wordId, item.text);
          }}
        >
          <SpeakerIcon />
        </IconButton>
      </div>

      <div className={`slots ${solved ? 'correct' : ''}`}>
        {item.syllables.map((_, k) => (
          <div key={k} className={`slot ${k === placed.length ? 'next' : ''}`}>
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
            state={shaking === tile.id ? 'shake' : mistake && tile === nextCorrect ? 'hint' : ''}
            onUse={() => use(tile)}
            showHand={demo && tile === nextCorrect}
          />
        ))}
      </div>
    </div>
  );
}
