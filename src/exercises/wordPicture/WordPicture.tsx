import { useApp } from '../../app/AppContext.tsx';
import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { wordItemId } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { WORD_PICTURE_ID, type WordPictureItem } from './generate.ts';

export function WordPicture(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { content } = useApp();
  const { item, pick, stateOf, showHand, markListen } = useChoiceRound<WordPictureItem>(props, {
    exerciseId: WORD_PICTURE_ID,
    itemId: (i) => wordItemId(i.wordId),
    // no prompt: the word is read, not heard; after a mistake it is heard slowly
    onWrong: (i) => audio.word(i.wordId, i.text, true),
  });

  return (
    <div className="exercise-stage word-picture">
      <div className="prompt">
        <span className="reading-word">{item.text}</span>
        <IconButton
          label={t('exercise.listen')}
          onClick={() => {
            markListen();
            audio.replay(() => audio.word(item.wordId, item.text));
          }}
        >
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="choices">
        {item.options.map((id) => {
          const imageId = content.wordsById.get(id)?.imageId;
          return (
            <ChoiceTile key={id} variant="picture" state={stateOf(id)} hand={showHand(id)} onPick={() => void pick(id)}>
              {imageId && <Picture imageId={imageId} size={128} />}
            </ChoiceTile>
          );
        })}
      </div>
    </div>
  );
}
