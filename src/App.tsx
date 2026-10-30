import { t } from './i18n.ts';

// Placeholder until M3 (Start, Home, Village, Session screens).
export function App() {
  return (
    <main className="start">
      <button type="button" className="go">
        {t('start.go')}
      </button>
    </main>
  );
}
