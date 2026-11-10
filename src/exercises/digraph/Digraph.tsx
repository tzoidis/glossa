import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { wordItemId } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { DIGRAPH_ID, LABELS, type DigraphItem } from './generate.ts';

export function Digraph(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { item, pick, stateOf, showHand, markListen } = useChoiceRound<DigraphItem>(props, {
    exerciseId: DIGRAPH_ID,
    itemId: (i) => wordItemId(i.wordId),
    // no prompt: the word is read; after a mistake it is heard slowly, so the one or two sounds come through
    onWrong: (i) => audio.word(i.wordId, i.text, true),
  });

  return (
    <div className="exercise-stage digraph">
      <div className="prompt">
        {item.imageId && <Picture imageId={item.imageId} size={140} />}
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
        {item.before}
        <span className="pair-mark">{item.pair}</span>
        {item.after}
      </span>
      <div className="choices">
        {item.options.map((o) => (
          <ChoiceTile key={o} state={stateOf(o)} hand={showHand(o)} onPick={() => void pick(o)}>
            <span className="choice-word">{LABELS[o]()}</span>
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
