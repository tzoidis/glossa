import { useApp } from '../../app/AppContext.tsx';
import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Mascot } from '../../ui/Mascot.tsx';
import { wordItemId } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { WHICH_WORD_ID, type WhichWordItem } from './generate.ts';

export function WhichWord(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { content } = useApp();
  const { item, pick, stateOf, showHand } = useChoiceRound<WhichWordItem>(props, {
    exerciseId: WHICH_WORD_ID,
    itemId: (i) => wordItemId(i.wordId),
    // the question is the sound of the word; the written choices are what the child reads
    prompt: (i, slow) => audio.word(i.wordId, i.text, slow),
  });

  return (
    <div className="exercise-stage which-word">
      <div className="prompt">
        <Mascot mood="thinking" size={160} />
        <IconButton label={t('exercise.listen')} onClick={() => audio.replay(() => audio.word(item.wordId, item.text))}>
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="choices">
        {item.options.map((id) => (
          <ChoiceTile key={id} state={stateOf(id)} hand={showHand(id)} onPick={() => void pick(id)}>
            <span className="letter">{content.wordsById.get(id)!.text}</span>
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
