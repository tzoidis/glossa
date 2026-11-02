// «Σχετικά» (PRD §8, licences): what the app is and the credits its assets ask for.

import { t, type UiKey } from '../../i18n.ts';

const CREDITS = ['pictures', 'font', 'voice'] as const;

export function AboutSection() {
  return (
    <section className="parent-card">
      <h2>{t('parent.section.about')}</h2>
      <p>{t('parent.about.app')}</p>
      <ul className="credits">
        {CREDITS.map((c) => (
          <li key={c}>{t(`parent.about.${c}` as UiKey)}</li>
        ))}
      </ul>
    </section>
  );
}
