import { OrderExercise } from '../shared/OrderExercise.tsx';
import type { ExerciseProps } from '../types.ts';
import { ALPHABET_ID } from './generate.ts';

export function Alphabet(props: ExerciseProps) {
  return <OrderExercise {...props} exerciseId={ALPHABET_ID} tileClass="syllable-tile" stageClass="alphabet" />;
}
