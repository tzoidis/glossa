import { OrderExercise } from '../shared/OrderExercise.tsx';
import type { ExerciseProps } from '../types.ts';
import { BUILD_WORD_ID } from './generate.ts';

export function BuildWord(props: ExerciseProps) {
  return <OrderExercise {...props} exerciseId={BUILD_WORD_ID} tileClass="letter-tile" />;
}
