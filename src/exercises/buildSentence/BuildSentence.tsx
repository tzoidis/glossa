import { OrderExercise } from '../shared/OrderExercise.tsx';
import type { ExerciseProps } from '../types.ts';
import { BUILD_SENTENCE_ID } from './generate.ts';

export function BuildSentence(props: ExerciseProps) {
  return <OrderExercise {...props} exerciseId={BUILD_SENTENCE_ID} tileClass="syllable-tile" stageClass="build-sentence" />;
}
