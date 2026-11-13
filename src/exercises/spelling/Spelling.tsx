import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { wordItemId } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { SPELLING_ID, type SpellingItem } from './generate.ts';

export function Spelling(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { item, pick, stateOf, showHand } = useChoiceRound<SpellingItem>(props, {
    exerciseId: SPELLING_ID,
    itemId: (i) => (i.wordId ? wordItemId(i.wordId) : `verb:${i.lead}:${i.target}`),
    // both spellings sound the same: the gentle «sounds right» message, then the word
    soundsRight: () => true,
    onWrong: async (i) => {
      if (i.wordId) await audio.word(i.wordId, i.target, true);
    },
  });

  return (
    <div className="exercise-stage spelling">
      {item.imageId && item.wordId && (
        <div className="prompt">
          <Picture imageId={item.imageId} size={160} />
          <IconButton label={t('exercise.listen')} onClick={() => audio.replay(() => audio.word(item.wordId!, item.target))}>
            <SpeakerIcon />
          </IconButton>
        </div>
      )}
      <div className="choices">
        {item.options.map((o) => (
          <ChoiceTile key={o} state={stateOf(o)} hand={showHand(o)} onPick={() => void pick(o)}>
            <span className="choice-word">
              {item.lead} {o}
            </span>
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
