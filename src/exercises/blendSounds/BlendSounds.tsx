import { useRef, useState } from 'react';
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
import { BLEND_SOUNDS_ID, type BlendSoundsItem } from './generate.ts';

const GAP_MS = 250;
const SLOW_GAP_MS = 600;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function BlendSounds(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { content } = useApp();
  const [beat, setBeat] = useState(-1);

  // one syllable at a time, with a dot lighting up for each (also works muted);
  // false if a tap or the next question cut it short
  const passes = useRef(0);
  const playSyllables = async (i: BlendSoundsItem, slow: boolean) => {
    const run = audio.sequence();
    const pass = ++passes.current;
    for (let k = 0; k < i.syllables.length && run.alive(); k++) {
      setBeat(k);
      await audio.syllable(i.syllables[k]!, slow);
      if (run.alive()) await sleep(slow ? SLOW_GAP_MS : GAP_MS);
    }
    if (pass === passes.current) setBeat(-1);
    return run.alive();
  };

  const { item, pick, stateOf, showHand } = useChoiceRound<BlendSoundsItem>(props, {
    exerciseId: BLEND_SOUNDS_ID,
    itemId: (i) => wordItemId(i.wordId),
    // after a mistake: the syllables slowly, then the whole word once
    // (pictures, not text: hearing it is fine)
    prompt: async (i, slow) => {
      if ((await playSyllables(i, slow)) && slow) await audio.word(i.wordId, i.text);
    },
  });

  return (
    <div className="exercise-stage blend-sounds">
      <div className="prompt">
        <div className="beats" aria-hidden>
          {item.syllables.map((_, k) => (
            <span key={k} className={`beat ${k === beat ? 'on' : ''}`} />
          ))}
        </div>
        <IconButton label={t('exercise.listen')} onClick={() => audio.replay(() => playSyllables(item, false))}>
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="choices">
        {item.options.map((id) => {
          const imageId = content.wordsById.get(id)?.imageId;
          return (
            <ChoiceTile key={id} variant="picture" state={stateOf(id)} hand={showHand(id)} onPick={() => void pick(id)}>
              {imageId && <Picture imageId={imageId} size={128} />}
            </ChoiceTile>
          );
        })}
      </div>
    </div>
  );
}
