import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { SpeakerIcon } from '../../ui/Icons.tsx';
import { Picture } from '../../ui/Picture.tsx';
import { storyItemId } from '../answer.ts';
import { ChoiceTile } from '../shared/ChoiceTile.tsx';
import { useChoiceRound } from '../shared/useChoiceRound.ts';
import { useRoundAudio } from '../shared/useRoundAudio.ts';
import type { ExerciseProps } from '../types.ts';
import { questionClipKey, READ_STORY_ID, storyClipKey, type StoryItem } from './generate.ts';

export function ReadStory(props: ExerciseProps) {
  const audio = useRoundAudio();
  const { item, pick, stateOf, showHand, markListen } = useChoiceRound<StoryItem>(props, {
    exerciseId: READ_STORY_ID,
    itemId: (i) => storyItemId(i.storyId, i.question),
    // no prompt: story and question are read, not heard; after a mistake the question is heard slowly
    onWrong: (i) => audio.sentence(questionClipKey(i.storyId, i.question), i.prompt, true),
  });

  const listen = (key: string, text: string) => {
    markListen();
    audio.replay(() => audio.sentence(key, text));
  };

  return (
    <div className="exercise-stage read-story">
      <div className="story">
        <div className="story-lines reading-sentence">
          {item.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <IconButton label={t('exercise.listen')} onClick={() => listen(storyClipKey(item.storyId), item.lines.join(' '))}>
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="prompt">
        <span className="story-question">{item.prompt}</span>
        <IconButton label={t('exercise.listen')} onClick={() => listen(questionClipKey(item.storyId, item.question), item.prompt)}>
          <SpeakerIcon />
        </IconButton>
      </div>
      <div className="choices">
        {item.options.map((code) => (
          <ChoiceTile key={code} variant="picture" state={stateOf(code)} hand={showHand(code)} onPick={() => void pick(code)}>
            <Picture imageId={code} size={96} />
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}
