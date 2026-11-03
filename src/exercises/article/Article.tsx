import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { wordItemId } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { ARTICLE_ID, type ArticleItem } from './generate.ts';

export function Article(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { item, pick, stateOf, showHand, markListen } = useChoiceRound<ArticleItem>(props, {
    exerciseId: ARTICLE_ID,
    itemId: (i) => wordItemId(i.wordId),
    // no prompt: the word is read; after a mistake it is heard slowly
    onWrong: (i) => audio.word(i.wordId, i.text, true),
  });
  const solved = stateOf(item.target) === 'correct';

  return (
    <div className="exercise-stage article">
      <div className="prompt">
        <Picture imageId={item.imageId} size={180} />
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
      <span className="reading-word">
        <span className={`gap ${solved ? 'gap--filled' : ''}`}>{solved ? item.target : ' '}</span> {item.text}
      </span>
      <div className="choices">
        {item.options.map((a) => (
          <ChoiceTile key={a} state={stateOf(a)} hand={showHand(a)} onPick={() => void pick(a)}>
            <span className="letter">{a}</span>
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
