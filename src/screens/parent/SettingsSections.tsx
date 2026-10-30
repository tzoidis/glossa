import { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext.tsx';
import { DIAERESIS_SKILL } from '../../engine/allowedWords.ts';
import { ALL_FLAGS, type Flag } from '../../engine/types.ts';
import { t, type UiKey } from '../../i18n.ts';
import { getDailyTime } from '../../storage/db.ts';
import { isValidPin } from './gate.ts';
import { useUpdateSettings } from './useSettings.ts';

const MINUTE_CHOICES = [5, 10, 15, 20, 25, 30, 45, 60];

export function TimeSection() {
  const { db, child, settings } = useApp();
  const update = useUpdateSettings();
  const [today, setToday] = useState(0);
  useEffect(() => {
    void getDailyTime(db, child.id).then(setToday);
  }, [db, child.id]);

  return (
    <section className="parent-card">
      <h2>{t('parent.section.time')}</h2>
      <select value={settings.dailyLimitMinutes} onChange={(e) => void update({ dailyLimitMinutes: Number(e.target.value) })}>
        {MINUTE_CHOICES.map((m) => (
          <option key={m} value={m}>
            {t('parent.time.minutes', { n: m })}
          </option>
        ))}
      </select>
      <p className="help">{t('parent.time.today', { n: Math.round(today / 60_000) })}</p>
    </section>
  );
}

export function FlagsSection() {
  const { settings, allow } = useApp();
  const update = useUpdateSettings();

  const toggleFlag = (f: Flag, on: boolean) =>
    void update({ extraFlags: on ? [...new Set([...settings.extraFlags, f])] : settings.extraFlags.filter((x) => x !== f) });
  const diaeresis = settings.extraSkills.includes(DIAERESIS_SKILL);

  return (
    <section className="parent-card">
      <h2>{t('parent.section.flags')}</h2>
      <p className="help">{t('parent.flags.help')}</p>
      <ul className="parent-list">
        {ALL_FLAGS.map((f) => {
          // a flag unlocked by the book's unit stays on; the parent can only add
          const byUnit = allow.unlockedFlags.has(f) && !settings.extraFlags.includes(f);
          return (
            <li key={f}>
              <label className="toggle-row">
                <input type="checkbox" checked={allow.unlockedFlags.has(f)} disabled={byUnit} onChange={(e) => toggleFlag(f, e.target.checked)} />
                <span className="grow-text">{t(`flag.${f}` as UiKey)}</span>
              </label>
            </li>
          );
        })}
        <li>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={diaeresis}
              onChange={(e) =>
                void update({
                  extraSkills: e.target.checked ? [...settings.extraSkills, DIAERESIS_SKILL] : settings.extraSkills.filter((s) => s !== DIAERESIS_SKILL),
                })
              }
            />
            <span className="grow-text">{t('skill.diaeresis')}</span>
          </label>
        </li>
      </ul>
    </section>
  );
}

export function OtherSection() {
  const { settings } = useApp();
  const update = useUpdateSettings();
  const [pin, setPin] = useState(settings.parentPin ?? '');
  const [pinMessage, setPinMessage] = useState<UiKey | null>(null);

  const savePin = () => {
    if (pin !== '' && !isValidPin(pin)) return setPinMessage('parent.pin.invalid');
    void update({ parentPin: pin === '' ? null : pin }).then(() => setPinMessage('parent.pin.saved'));
  };

  return (
    <section className="parent-card">
      <h2>{t('parent.section.other')}</h2>
      <label className="toggle-row">
        <input type="checkbox" checked={settings.leftHanded} onChange={(e) => void update({ leftHanded: e.target.checked })} />
        <span className="grow-text">{t('parent.leftHanded')}</span>
      </label>
      <label className="field">
        <span>{t('parent.pin')}</span>
        <span className="field-row">
          <input
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ''));
              setPinMessage(null);
            }}
          />
          <button type="button" className="parent-button" onClick={savePin}>
            {t('parent.pin.save')}
          </button>
        </span>
      </label>
      {pinMessage && <p className="help">{t(pinMessage)}</p>}
    </section>
  );
}
