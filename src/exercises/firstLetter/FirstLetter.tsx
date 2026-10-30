import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { wordItemId } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { FIRST_LETTER_ID, type FirstLetterItem } from './generate.ts';

export function FirstLetter(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { item, pick, stateOf, showHand } = useChoiceRound<FirstLetterItem>(props, {
    exerciseId: FIRST_LETTER_ID,
    itemId: (i) => wordItemId(i.wordId),
    prompt: (i, slow) => audio.word(i.wordId, i.text, slow),
    // stressed replay: the first sound, then the word slowly («ννν-ερό»)
    onWrong: (i) => audio.phoneme(i.target),
  });

  return (
    <div className="exercise-stage first-letter">
      <div className="prompt">
        <Picture imageId={item.imageId} size={200} />
        <IconButton label={t('exercise.listen')} onClick={() => void audio.word(item.wordId, item.text)}>
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="choices">
        {item.options.map((g) => (
          <ChoiceTile key={g} state={stateOf(g)} hand={showHand(g)} onPick={() => void pick(g)}>
            <span className="letter">{g}</span>
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
