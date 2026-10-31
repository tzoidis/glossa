import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Mascot } from '../../ui/Mascot.tsx';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { WHICH_SYLLABLE_ID, whichSyllableItemId, type WhichSyllableItem } from './generate.ts';

export function WhichSyllable(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { item, pick, stateOf, showHand } = useChoiceRound<WhichSyllableItem>(props, {
    exerciseId: WHICH_SYLLABLE_ID,
    itemId: whichSyllableItemId,
    // the question is the sound; the written choices are what the child reads
    prompt: (i, slow) => audio.syllable(i.target, slow),
  });

  return (
    <div className="exercise-stage which-syllable">
      <div className="prompt">
        <Mascot mood="thinking" size={160} />
        <IconButton label={t('exercise.listen')} onClick={() => audio.replay(() => audio.syllable(item.target))}>
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="choices">
        {item.options.map((s) => (
          <ChoiceTile key={s} state={stateOf(s)} hand={showHand(s)} onPick={() => void pick(s)}>
            <span className="letter">{s}</span>
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
