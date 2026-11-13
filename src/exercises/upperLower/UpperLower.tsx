// Memory board: tap a card to turn it; two of the same letter stay open, two
// different ones turn back. A pair counts as missed only when the child had
// already seen both its cards and still turned a wrong one after one of them:
// a miss of reading capital and small together, not of memory.

import { useEffect, useRef, useState } from 'react';
import type { Round } from '../../engine/types.ts';
import { t } from '../../i18n.ts';
import { caseItemId, makeAnswer } from '../answer.ts';
import { Hand, useDemo, useOpensWithInstruction } from '../shared/demo.tsx';
import { useLater } from '../shared/useLater.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { UPPER_LOWER_ID, type MemoryCard, type UpperLowerItem } from './generate.ts';

const TURN_BACK_MS = 1000;

export function UpperLower({ round, onAnswer, onComplete }: ExerciseProps) {
  const items = (round as Round).items as UpperLowerItem[];
  const audio = useRoundAudio();
  const demo = useDemo();
  const later = useLater();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const seen = useRef(new Set<string>());
  const missed = useRef(new Set<string>());
  const shownAt = useRef(Date.now());
  const busy = useRef(false);
  const item = items[index]!;
  const withInstruction = useOpensWithInstruction(index);

  useEffect(() => {
    shownAt.current = Date.now();
    if (withInstruction) void audio.instruction(UPPER_LOWER_ID);
    return () => audio.stop();
  }, [index, audio, withInstruction]);

  const log = (letter: string, given: string, correct: boolean, attempt: 1 | 2) =>
    onAnswer(
      makeAnswer(round, {
        itemId: caseItemId(letter),
        target: letter,
        given,
        correct,
        attempt,
        position: index,
        latencyMs: Date.now() - shownAt.current,
      }),
    );

  const turn = (card: MemoryCard) => {
    if (busy.current || open.includes(card.id) || matched.includes(card.letter)) return;
    const firstId = open[0];
    if (!firstId) {
      seen.current.add(card.id);
      setOpen([card.id]);
      return;
    }
    const first = item.cards.find((c) => c.id === firstId)!;
    const partnerSeen = (c: MemoryCard) => item.cards.some((o) => o.letter === c.letter && o.id !== c.id && seen.current.has(o.id));
    const knewIt = partnerSeen(first);
    seen.current.add(card.id);
    setOpen([firstId, card.id]);

    if (first.letter === card.letter) {
      const wasMissed = missed.current.has(card.letter);
      log(card.letter, card.letter, true, wasMissed ? 2 : 1);
      const done = [...matched, card.letter];
      setMatched(done);
      setOpen([]);
      if (done.length === item.pairs.length) {
        busy.current = true;
        void audio.praiseThen(() => {
          busy.current = false;
          if (index + 1 >= items.length) return onComplete();
          seen.current = new Set();
          missed.current = new Set();
          setMatched([]);
          setIndex(index + 1);
        });
      }
      return;
    }

    if (knewIt && !missed.current.has(first.letter)) {
      missed.current.add(first.letter);
      log(first.letter, card.letter, false, 1);
    }
    busy.current = true;
    later(() => {
      busy.current = false;
      setOpen([]);
    }, TURN_BACK_MS);
  };

  // the demo hand: the partner of the open card, else the first card of a pair still hidden
  const openCard = item.cards.find((c) => c.id === open[0]);
  const handOn = demo
    ? openCard
      ? item.cards.find((c) => c.letter === openCard.letter && c.id !== openCard.id)?.id
      : item.cards.find((c) => !matched.includes(c.letter))?.id
    : undefined;

  return (
    <div className="exercise-stage upper-lower">
      <div className={`memory-grid memory-grid--${item.cards.length}`}>
        {item.cards.map((card) => {
          const faceUp = open.includes(card.id) || matched.includes(card.letter);
          return (
            <button
              key={card.id}
              type="button"
              className={`memory-card ${faceUp ? 'face-up' : ''} ${matched.includes(card.letter) ? 'matched' : ''}`}
              aria-label={faceUp ? card.text : t('exercise.upper-lower.card')}
              onClick={() => turn(card)}
            >
              {faceUp ? card.text : ''}
              {handOn === card.id && <Hand />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
