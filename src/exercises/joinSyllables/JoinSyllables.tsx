import { OrderExercise } from '../shared/OrderExercise.tsx';
import type { ExerciseProps } from '../types.ts';
import { JOIN_SYLLABLES_ID } from './generate.ts';

export function JoinSyllables(props: ExerciseProps) {
  return <OrderExercise {...props} exerciseId={JOIN_SYLLABLES_ID} tileClass="syllable-tile" />;
}
