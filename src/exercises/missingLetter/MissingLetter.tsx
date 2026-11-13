import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { graphemeItemId } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { MISSING_LETTER_ID, type MissingLetterItem } from './generate.ts';

export function MissingLetter(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { item, pick, stateOf, showHand, solved, markListen } = useChoiceRound<MissingLetterItem>(props, {
    exerciseId: MISSING_LETTER_ID,
    itemId: (i) => graphemeItemId(i.target),
    // no prompt: the word is read, not heard; after a mistake it is heard slowly
    onWrong: (i) => audio.word(i.wordId, i.text, true),
  });

  return (
    <div className="exercise-stage missing-letter">
      <div className="prompt">
        <Picture imageId={item.imageId} size={160} />
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
        {item.parts.map((p, i) =>
          i === item.gap ? (
            <span key={i} className={`gap ${solved ? 'gap--filled' : ''}`}>
              {solved ? p : ' '}
            </span>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </span>
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
