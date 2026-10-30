// Two big station cards; the child picks one (PRD §5). No text: each station is a picture.

import { findExercise } from '../exercises/registry.ts';
import { t } from '../i18n.ts';
import { Picture } from '../ui/Picture.tsx';

export function StationChoice({ options, onPick }: { options: string[]; onPick(id: string): void }) {
  return (
    <div className="stations">
      {options.map((id, i) => {
        const entry = findExercise(id);
        if (!entry) return null;
        return (
          <button key={id} type="button" className={`station station--${i}`} aria-label={`${t('session.station')} ${i + 1}`} onClick={() => onPick(id)}>
            <Picture imageId={entry.icon} size={140} />
          </button>
        );
      })}
    </div>
  );
}
