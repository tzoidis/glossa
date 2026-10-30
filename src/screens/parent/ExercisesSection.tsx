import { useApp, type App } from '../../app/AppContext.tsx';
import { buildGenerateContext } from '../../app/generateContext.ts';
import { canGenerate, EXERCISES, type ExerciseEntry } from '../../exercises/registry.ts';
import { t, type UiKey } from '../../i18n.ts';
import { Picture } from '../../ui/Picture.tsx';
import { useUpdateSettings } from './useSettings.ts';

type Status = 'ok' | 'off' | 'later' | 'noVoice' | 'noPhonemes' | 'noContent';

/** Why an exercise is or is not offered to the child right now. */
export function exerciseStatus({ module: m }: ExerciseEntry, app: App): Status {
  const { settings } = app;
  if (settings.enabledExercises && !settings.enabledExercises.includes(m.id)) return 'off';
  if (m.requires.minGraphemes > settings.upToPosition) return 'later';
  if (m.requires.needs.includes('localTTS') && !app.voice) return 'noVoice';
  if (m.requires.needs.includes('phonemeAudio') && !app.hasPhonemeAudio) return 'noPhonemes';
  const ctx = buildGenerateContext({ content: app.content, allow: app.allow, level: 1, recentWordIds: [], reviewQueue: [], seed: 1 });
  return canGenerate(m, ctx) ? 'ok' : 'noContent';
}

export function ExercisesSection() {
  const app = useApp();
  const update = useUpdateSettings();
  const all = EXERCISES.map((e) => e.module.id);
  const enabled = app.settings.enabledExercises ?? all;

  const toggle = (id: string, on: boolean) => {
    const next = on ? [...new Set([...enabled, id])] : enabled.filter((x) => x !== id);
    void update({ enabledExercises: next.length === all.length ? null : next });
  };

  return (
    <section className="parent-card">
      <h2>{t('parent.section.exercises')}</h2>
      <ul className="parent-list">
        {EXERCISES.map((entry) => {
          const id = entry.module.id;
          const status = exerciseStatus(entry, app);
          return (
            <li key={id}>
              <label className="toggle-row">
                <input type="checkbox" checked={enabled.includes(id)} onChange={(e) => toggle(id, e.target.checked)} />
                <Picture imageId={entry.icon} size={32} />
                <span className="grow-text">{t(`exercise.${id}` as UiKey)}</span>
                <span className={`status status--${status === 'ok' ? 'ok' : 'warn'}`}>{t(`exercise.status.${status}` as UiKey)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
