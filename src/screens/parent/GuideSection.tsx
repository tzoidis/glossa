// How the app works, for the parent. Open until the child has played, then
// closed so the settings stay in reach.

import { t, type UiKey } from '../../i18n.ts';

const TOPICS = ['session', 'letters', 'games', 'mistakes', 'village', 'time', 'audio', 'data'] as const;

export function GuideSection({ open }: { open: boolean }) {
  return (
    <section className="parent-card guide">
      <details open={open}>
        <summary>{t('parent.guide.title')}</summary>
        {TOPICS.map((topic) => (
          <div key={topic}>
            <h3>{t(`parent.guide.${topic}.title` as UiKey)}</h3>
            <p>{t(`parent.guide.${topic}.body` as UiKey)}</p>
          </div>
        ))}
      </details>
    </section>
  );
}
