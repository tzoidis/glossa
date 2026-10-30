import { useState } from 'react';
import { useApp } from '../../app/AppContext.tsx';
import { t } from '../../i18n.ts';
import { IconButton } from '../../ui/IconButton.tsx';
import { HomeIcon } from '../../ui/Icons.tsx';
import { gatePasses, makeGateQuestion } from './gate.ts';

export function ParentGate({ onPass, onCancel }: { onPass(): void; onCancel(): void }) {
  const { settings } = useApp();
  const [question, setQuestion] = useState(() => makeGateQuestion());
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const pin = settings.parentPin;

  const submit = () => {
    if (gatePasses(value, question, pin)) return onPass();
    setWrong(true);
    setValue('');
    setQuestion(makeGateQuestion());
  };

  return (
    <main className="screen screen--center parent-gate">
      <form
        className="gate-card"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="gate-input">{pin ? t('parent.gate.pin') : t('parent.gate.question', { a: question.a, b: question.b })}</label>
        <input
          id="gate-input"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          type={pin ? 'password' : 'text'}
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, ''));
            setWrong(false);
          }}
        />
        {wrong && <p className="gate-wrong">{t('parent.gate.wrong')}</p>}
        <button type="submit" className="parent-button primary">
          {t('parent.gate.enter')}
        </button>
      </form>
      <IconButton label={t('nav.home')} onClick={onCancel}>
        <HomeIcon />
      </IconButton>
    </main>
  );
}
