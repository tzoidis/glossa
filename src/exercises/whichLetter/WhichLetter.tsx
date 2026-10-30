import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Mascot } from '../../ui/Mascot.tsx';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { WHICH_LETTER_ID, whichLetterItemId, type WhichLetterItem } from './generate.ts';

export function WhichLetter(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { item, pick, stateOf, showHand } = useChoiceRound<WhichLetterItem>(props, {
    exerciseId: WHICH_LETTER_ID,
    itemId: whichLetterItemId,
    // recorded sound only, never TTS (PRD §6)
    prompt: (i) => audio.phoneme(i.target),
  });

  return (
    <div className="exercise-stage which-letter">
      <div className="prompt">
        <Mascot mood="thinking" size={160} />
        <IconButton label={t('exercise.listen')} onClick={() => void audio.phoneme(item.target)}>
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
