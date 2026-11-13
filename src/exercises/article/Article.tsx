import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { wordItemId } from '../answer.ts';
import { useApp } from '../../app/AppContext.tsx';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { SyllableWord, useSyllableReplay } from '../shared/SyllableWord.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { ARTICLE_ID, type ArticleItem } from './generate.ts';

export function Article(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { content } = useApp();
  const syllables = useSyllableReplay();
  const { item, pick, stateOf, showHand, markListen } = useChoiceRound<ArticleItem>(props, {
    exerciseId: ARTICLE_ID,
    itemId: (i) => wordItemId(i.wordId),
    // no prompt: the word is read; after a mistake it is decoded aloud, syllable by syllable
    onWrong: (i) => syllables.replay(content.wordsById.get(i.wordId)!),
  });
  const word = content.wordsById.get(item.wordId)!;
  const solved = stateOf(item.target) === 'correct';

  return (
    <div className="exercise-stage article">
      <div className="prompt">
        {/* shown only once solved: with the picture a child knows the article without reading the word */}
        <span className="article-picture">{solved ? <Picture imageId={item.imageId} size={180} /> : <span className="picture-placeholder" />}</span>
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
      <SyllableWord
        word={word}
        lit={syllables.lit}
        before={
          <>
            <span className={`gap ${solved ? 'gap--filled' : ''}`}>{solved ? item.target : ' '}</span>{' '}
          </>
        }
      />
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
