import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { LAST_SYLLABLE_ID, lastSyllableItemId, type LastSyllableItem } from './generate.ts';

export function LastSyllable(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { item, pick, stateOf, showHand } = useChoiceRound<LastSyllableItem>(props, {
    exerciseId: LAST_SYLLABLE_ID,
    itemId: lastSyllableItemId,
    prompt: (i, slow) => audio.word(i.wordId, i.text, slow),
    // hint: the last syllable on its own; the word then replays slowly («…τα, πατάτα»)
    onWrong: (i) => audio.syllable(i.target),
  });

  return (
    <div className="exercise-stage last-syllable">
      <div className="prompt">
        <Picture imageId={item.imageId} size={200} />
        <IconButton label={t('exercise.listen')} onClick={() => audio.replay(() => audio.word(item.wordId, item.text))}>
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="choices">
        {item.options.map((s) => (
          <ChoiceTile key={s} state={stateOf(s)} hand={showHand(s)} onPick={() => void pick(s)}>
            <span className="syllable">{s}</span>
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
