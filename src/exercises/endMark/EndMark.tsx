import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { sentenceItemId } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { END_MARK_ID, type EndMarkItem } from './generate.ts';

export function EndMark(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { item, pick, stateOf, showHand, markListen } = useChoiceRound<EndMarkItem>(props, {
    exerciseId: END_MARK_ID,
    itemId: (i) => sentenceItemId(i.sentenceId),
    // no prompt: the sentence is read; after a mistake it is heard slowly, its tune the hint
    onWrong: (i) => audio.sentence(i.sentenceId, i.full, true),
  });
  const solved = stateOf(item.target) === 'correct';

  return (
    <div className="exercise-stage end-mark">
      <div className="prompt">
        <span className="reading-sentence">
          {item.text}
          <span className={`gap end-gap ${solved ? 'gap--filled' : ''}`}>{solved ? item.target : ' '}</span>
        </span>
        <IconButton
          label={t('exercise.listen')}
          onClick={() => {
            markListen();
            audio.replay(() => audio.sentence(item.sentenceId, item.full));
          }}
        >
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="choices">
        {item.options.map((m) => (
          <ChoiceTile key={m} state={stateOf(m)} hand={showHand(m)} label={m} onPick={() => void pick(m)}>
            <span className="letter mark">{m}</span>
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
