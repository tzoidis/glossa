import { useApp } from '../../app/AppContext.tsx';
import { useNextLetterDue } from '../../app/useNextLetterDue.ts';
import { allowedWords, makeContext, unitReached } from '../../engine/allowedWords.ts';
import { t } from '../../i18n.ts';
import { useUpdateSettings } from './useSettings.ts';

export function LettersSection() {
  const { content, settings } = useApp();
  const update = useUpdateSettings();
  const { curriculum, order } = content;
  const position = settings.upToPosition;
  const nextLetter = useNextLetterDue();
  // a new letter, or «not yet», starts the count for the reminder again
  const setPosition = (p: number) => void update({ upToPosition: p, letterCheckFrom: Date.now() });

  const readable = allowedWords(
    content.words,
    makeContext(curriculum, { position, extraFlags: settings.extraFlags, extraSkills: settings.extraSkills }, content.words),
  ).length;
  const sightWords = curriculum.units.filter((u) => unitReached(u, order, position)).flatMap((u) => u.sightWords);

  return (
    <section className="parent-card">
      <h2>{t('parent.section.letters')}</h2>
      <p className="help">{t('parent.letters.help')}</p>
      {nextLetter && (
        <p className="warn-text">
          {t('parent.letters.nextHint')}{' '}
          <button type="button" className="parent-button subtle" onClick={() => void update({ letterCheckFrom: Date.now() })}>
            {t('parent.letters.notYet')}
          </button>
        </p>
      )}
      <button type="button" className={`parent-chip ${position === 0 ? 'selected' : ''}`} onClick={() => setPosition(0)}>
        {t('parent.letters.none')}
      </button>
      {curriculum.units
        .filter((u) => u.graphemes.length > 0)
        .map((unit) => {
          const start = order.unitStart.get(unit.id) ?? 0;
          return (
            <div key={unit.id} className="unit-row">
              <span className="unit-title">{unit.title}</span>
              <div className="letter-chips">
                {unit.graphemes.map((g, k) => {
                  const p = start + k + 1;
                  return (
                    <button
                      key={g}
                      type="button"
                      className={`letter-chip ${p <= position ? 'taught' : ''} ${p === position ? 'selected' : ''}`}
                      aria-pressed={p === position}
                      onClick={() => setPosition(p)}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      <p>{t('parent.letters.words', { n: readable })}</p>
      <p className="help">{sightWords.length ? t('parent.sightWords', { list: sightWords.join(', ') }) : t('parent.sightWords.none')}</p>
    </section>
  );
}
