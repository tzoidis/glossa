// «Πρόοδος» (PRD §7, phase 2): the last 7 days at a glance, and a button that
// brings the hardest letters and words into the next rounds.

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext.tsx';
import type { AnswerLog } from '../../engine/types.ts';
import { t, type UiKey } from '../../i18n.ts';
import { practiceSoon } from '../../storage/progress.ts';
import { summarize, WEEK_MS, type Hard } from './progressStats.ts';

const minutes = (ms: number) => (ms > 0 && ms < 30_000 ? t('parent.progress.underMinute') : String(Math.round(ms / 60_000)));
/** «1 λάθος», «2 λάθη»: keys with a `.one` form for n = 1 */
const count = (key: UiKey, n: number, vars: Record<string, string | number> = {}) => t((n === 1 ? `${key}.one` : key) as UiKey, { n, ...vars });
const percent = (part: number, whole: number) => (whole ? Math.round((100 * part) / whole) : 0);

function HardList({ title, items }: { title: string; items: Hard[] }) {
  if (!items.length) return null;
  return (
    <>
      <h3>{title}</h3>
      <ul className="progress-hard">
        {items.map((h) => (
          <li key={h.key}>
            <span className="reading-chip">{h.text}</span> {count('parent.progress.mistakes', h.mistakes, { of: h.tries })}
          </li>
        ))}
      </ul>
    </>
  );
}

export function ProgressSection() {
  const { db, child, content } = useApp();
  const [answers, setAnswers] = useState<AnswerLog[] | null>(null);
  const [playMs, setPlayMs] = useState(0);
  const [queued, setQueued] = useState(false);
  const [now] = useState(Date.now);

  useEffect(() => {
    const from = now - WEEK_MS;
    void db.answers.where('[childId+ts]').between([child.id, from], [child.id, Infinity]).toArray().then(setAnswers);
    void db.dailyTime
      .where('childId')
      .equals(child.id)
      .toArray()
      .then((days) => setPlayMs(days.filter((d) => new Date(`${d.date}T23:59:59`).getTime() > from).reduce((sum, d) => sum + d.ms, 0)));
  }, [db, child.id, now]);

  const summary = useMemo(() => (answers ? summarize(answers, content, now) : null), [answers, content, now]);
  if (!summary) return null;

  const unitTitle = (id: number) => content.curriculum.units.find((u) => u.id === id)?.title ?? String(id);
  const hard = [...summary.letters, ...summary.words];

  return (
    <section className="parent-card">
      <h2>{t('parent.section.progress')}</h2>
      {summary.firstAttempts === 0 ? (
        <p className="help">{t('parent.progress.empty')}</p>
      ) : (
        <>
          <p>{t('parent.progress.time', { n: minutes(playMs) })}</p>
          <table className="progress-table">
            <thead>
              <tr>
                <th>{t('parent.progress.unit')}</th>
                <th>{t('parent.progress.firstTry')}</th>
                <th>{t('parent.progress.minutes')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.units.map((u) => (
                <tr key={u.unitId}>
                  <td>{unitTitle(u.unitId)}</td>
                  <td>
                    {percent(u.correct, u.firstAttempts)}% <span className="help">({count('parent.progress.answers', u.firstAttempts)})</span>
                  </td>
                  <td>{minutes(u.ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="help">{t('parent.progress.help')}</p>

          <HardList title={t('parent.progress.letters')} items={summary.letters} />
          <HardList title={t('parent.progress.words')} items={summary.words} />

          {summary.confusions.length > 0 && (
            <>
              <h3>{t('parent.progress.confusions')}</h3>
              <ul className="progress-hard">
                {summary.confusions.map((c) => (
                  <li key={`${c.target}>${c.given}`}>{count('parent.progress.confusion', c.count, { given: c.given, target: c.target })}</li>
                ))}
              </ul>
            </>
          )}

          <p>{count('parent.progress.listened', summary.listened)}</p>

          {hard.length > 0 &&
            (queued ? (
              <p className="help">{t('parent.progress.practiceQueued')}</p>
            ) : (
              <button
                type="button"
                className="parent-button primary"
                onClick={() => void practiceSoon(db, child.id, hard.map((h) => h.key), child.roundsPlayed).then(() => setQueued(true))}
              >
                {t('parent.progress.practice')}
              </button>
            ))}
        </>
      )}
    </section>
  );
}
