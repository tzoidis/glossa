// Shared logic of "tap the right one" exercises (PRD §4): the wrong choice fades and
// the prompt is heard again slowly; the child tries once more on their own, and the
// right one glows only if that is not enough (or one choice is left). Only the first
// attempt counts; a misspelling that sounds right is logged as such.

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
      // always logged: the round counts the solved questions (pebbles); only attempt 1 counts for statistics
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
    // attempt 1, then the child's own second try; later wrong taps are not logged
    if (faded.length < 2) log(option, false, faded.length === 0 ? 1 : 2, soundsRight);
    setMistake(true);
    setFaded((f) => [...f, option]);
    if (soundsRight) await audio.instruction('sounds-right');
    if (run.alive()) await cfg.current.onWrong?.(item, option);
    if (run.alive()) await cfg.current.prompt?.(item, true);
  };

  // the glow comes after a second mistake, or when only the right one is left anyway
  const hint = faded.length >= 2 || item.options.length - faded.length <= 1;
  const stateOf = (option: string): ChoiceState =>
    solved && option === item.target ? 'correct' : faded.includes(option) ? 'faded' : hint && option === item.target ? 'hint' : '';

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
