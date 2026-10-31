// Shared logic of "tap the right one" exercises (PRD §4): the wrong choice fades,
// the prompt is heard again, the right one glows and the child taps it; only the
// first attempt counts; a misspelling that sounds right is logged as such.

import { useEffect, useRef, useState } from 'react';
import type { Round } from '../../engine/types.ts';
import { makeAnswer } from '../answer.ts';
import type { ExerciseProps } from '../types.ts';
import { useDemo, useOpensWithInstruction } from './demo.tsx';
import { useRoundAudio } from './useRoundAudio.ts';

export interface ChoiceItem {
  target: string;
  options: string[];
}

export interface ChoiceConfig<T extends ChoiceItem> {
  exerciseId: string;
  /** review-queue key, e.g. word:pie */
  itemId(item: T): string;
  /** play the prompt (after the instruction on the first item) */
  prompt?(item: T, slow: boolean): Promise<unknown>;
  /** extra feedback after a mistake, before the prompt is replayed slowly */
  onWrong?(item: T, given: string): Promise<unknown>;
  soundsRight?(item: T, given: string): boolean;
}

export type ChoiceState = 'correct' | 'faded' | 'hint' | '';

export function useChoiceRound<T extends ChoiceItem>({ round, onAnswer, onComplete }: ExerciseProps, config: ChoiceConfig<T>) {
  const items = (round as Round).items as T[];
  const audio = useRoundAudio();
  const demo = useDemo();
  const [index, setIndex] = useState(0);
  const [faded, setFaded] = useState<string[]>([]);
  const [mistake, setMistake] = useState(false);
  const [solved, setSolved] = useState(false);
  const usedListen = useRef(false);
  const shownAt = useRef(Date.now());
  const item = items[index]!;
  const cfg = useRef(config);
  cfg.current = config;

  const withInstruction = useOpensWithInstruction(index);

  useEffect(() => {
    shownAt.current = Date.now();
    usedListen.current = false;
    const run = audio.sequence();
    (async () => {
      if (withInstruction) await audio.instruction(cfg.current.exerciseId);
      if (run.alive()) await cfg.current.prompt?.(item, false);
    })();
    return () => audio.stop();
  }, [index, item, audio, withInstruction]);

  const log = (given: string, correct: boolean, attempt: 1 | 2, soundsRight = false) =>
    onAnswer(
      makeAnswer(round, {
        itemId: cfg.current.itemId(item),
        target: item.target,
        given,
        correct,
        attempt,
        position: index,
        soundsRight,
        usedListen: usedListen.current,
        latencyMs: Date.now() - shownAt.current,
      }),
    );

  const pick = async (option: string) => {
    if (solved || faded.includes(option)) return;
    // a tap ends whatever was playing; what follows plays only if no newer tap came
    audio.stop();
    const run = audio.sequence();
    if (option === item.target) {
      log(option, true, mistake ? 2 : 1);
      setSolved(true);
      await audio.praiseThen(() => {
        if (index + 1 >= items.length) return onComplete();
        setIndex(index + 1);
        setFaded([]);
        setMistake(false);
        setSolved(false);
      });
      return;
    }
    const soundsRight = cfg.current.soundsRight?.(item, option) ?? false;
    if (!mistake) log(option, false, 1, soundsRight);
    setMistake(true);
    setFaded((f) => [...f, option]);
    if (soundsRight) await audio.instruction('sounds-right');
    if (run.alive()) await cfg.current.onWrong?.(item, option);
    if (run.alive()) await cfg.current.prompt?.(item, true);
  };

  const stateOf = (option: string): ChoiceState =>
    solved && option === item.target ? 'correct' : faded.includes(option) ? 'faded' : mistake && option === item.target ? 'hint' : '';

  return {
    item,
    index,
    pick,
    stateOf,
    solved,
    showHand: (option: string) => demo && !solved && option === item.target,
    /** the child asked to hear reading material: counts as help (PRD §4) */
    markListen: () => {
      usedListen.current = true;
    },
  };
}
