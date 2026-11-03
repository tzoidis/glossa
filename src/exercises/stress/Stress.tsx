import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { useApp } from '../../app/AppContext.tsx';
import { wordItemId } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { STRESS_ID, type StressItem } from './generate.ts';

export function Stress(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { content } = useApp();
  const { item, pick, stateOf, showHand } = useChoiceRound<StressItem>(props, {
    exerciseId: STRESS_ID,
    itemId: (i) => wordItemId(i.wordId),
    // the word is heard (PRD §4); after a mistake it replays slowly
    prompt: (i, slow) => audio.word(i.wordId, i.text, slow),
  });
  const imageId = content.wordsById.get(item.wordId)?.imageId;

  return (
    <div className="exercise-stage stress">
      <div className="prompt">
        {imageId && <Picture imageId={imageId} size={160} />}
        <IconButton label={t('exercise.listen')} onClick={() => audio.replay(() => audio.word(item.wordId, item.text))}>
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="choices stress-syllables">
        {item.options.map((id, i) => {
          const state = stateOf(id);
          return (
            <ChoiceTile key={id} variant="letter" state={state} hand={showHand(id)} onPick={() => void pick(id)}>
              <span className="syllable">{state === 'correct' ? item.syllables[i] : item.bare[i]}</span>
            </ChoiceTile>
          );
        })}
      </div>
    </div>
  );
}
