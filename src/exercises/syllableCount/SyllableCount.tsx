import { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext.tsx';
import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { wordItemId } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { SYLLABLE_COUNT_ID, type SyllableCountItem } from './generate.ts';

const CLAP = '1F44F';

export function SyllableCount(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { audio: service } = useApp();
  const [beat, setBeat] = useState<{ total: number; on: number } | null>(null);

  const { item, index, pick, stateOf, showHand } = useChoiceRound<SyllableCountItem>(props, {
    exerciseId: SYLLABLE_COUNT_ID,
    itemId: (i) => wordItemId(i.wordId),
    prompt: (i, slow) => audio.word(i.wordId, i.text, slow),
    // after a mistake, hear it syllable by syllable while the beats light up
    onWrong: async (i) => {
      // stops when anything else plays (a right answer's praise, the next item)
      const run = audio.sequence();
      for (let k = 0; k < i.syllables.length; k++) {
        if (!run.alive()) return;
        setBeat({ total: i.syllables.length, on: k });
        await service.play({ kind: 'syllable', key: i.syllables[k]!, text: i.syllables[k]!, slow: true });
      }
      if (run.alive()) setBeat({ total: i.syllables.length, on: -1 });
    },
  });

  useEffect(() => setBeat(null), [index]);

  return (
    <div className="exercise-stage syllable-count">
      <div className="prompt">
        <Picture imageId={item.imageId} size={200} />
        <IconButton label={t('exercise.listen')} onClick={() => audio.replay(() => audio.word(item.wordId, item.text))}>
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="beats" aria-hidden>
        {beat?.total !== undefined &&
          Array.from({ length: beat.total }, (_, k) => <span key={k} className={`beat ${k <= beat.on || beat.on === -1 ? 'on' : ''}`} />)}
      </div>
      <div className="choices">
        {item.options.map((n) => (
          <ChoiceTile key={n} variant="count" label={n} state={stateOf(n)} hand={showHand(n)} onPick={() => void pick(n)}>
            {Array.from({ length: Number(n) }, (_, k) => (
              <Picture key={k} imageId={CLAP} size={48} />
            ))}
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
