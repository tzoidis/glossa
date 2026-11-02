import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { sentenceItemId } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { TRUE_FALSE_ID, YES, type TrueFalseItem } from './generate.ts';

const ICON = { yes: '2705', no: '274C' } as const;

export function TrueFalse(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { item, pick, stateOf, showHand, markListen } = useChoiceRound<TrueFalseItem>(props, {
    exerciseId: TRUE_FALSE_ID,
    itemId: (i) => sentenceItemId(i.sentenceId),
    // no prompt: the sentence is read, not heard; after a mistake it is heard slowly
    onWrong: (i) => audio.sentence(i.sentenceId, i.text, true),
  });

  return (
    <div className="exercise-stage true-false">
      <div className="prompt">
        <Picture imageId={item.imageId} size={160} />
        <span className="reading-sentence">{item.text}</span>
        <IconButton
          label={t('exercise.listen')}
          onClick={() => {
            markListen();
            audio.replay(() => audio.sentence(item.sentenceId, item.text));
          }}
        >
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="choices">
        {item.options.map((o) => (
          <ChoiceTile
            key={o}
            variant="picture"
            label={t(o === YES ? 'exercise.true-false.yes' : 'exercise.true-false.no')}
            state={stateOf(o)}
            hand={showHand(o)}
            onPick={() => void pick(o)}
          >
            <Picture imageId={ICON[o]} size={112} />
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
