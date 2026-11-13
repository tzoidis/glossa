// App-wide services: database, settings, audio, content.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createBrowserAudioService, type AudioService, type VoiceInfo } from '../audio/AudioService.ts';
import { bundledUrl } from '../audio/bundled.ts';
import { makeContext, type AllowContext } from '../engine/allowedWords.ts';
import { ensureChild, openDb, type GlossaDb } from '../storage/db.ts';
import { DEFAULT_CHILD_ID, type Child, type Settings } from '../storage/schema.ts';
import { t } from '../i18n.ts';
import { Mascot } from '../ui/Mascot.tsx';
import { CONTENT, defaultPosition, type Content } from './content.ts';

export interface App {
  db: GlossaDb;
  audio: AudioService;
  content: Content;
  child: Child;
  settings: Settings;
  allow: AllowContext;
  voice: VoiceInfo | null;
  /** re-read child and settings after a write */
  refresh(): Promise<void>;
  /** look for the local voice again (call after the first tap: iOS may only list voices then) */
  recheckVoice(): void;
}

const AppContext = createContext<App | null>(null);

export function useApp(): App {
  const app = useContext(AppContext);
  if (!app) throw new Error('useApp outside AppProvider');
  return app;
}

interface Loaded {
  db: GlossaDb;
  audio: AudioService;
  child: Child;
  settings: Settings;
  voice: VoiceInfo | null;
}

export interface AppProviderProps {
  children: ReactNode;
  /** tests and the smoke test inject their own */
  audio?: AudioService;
  dbName?: string;
  fallback: ReactNode;
}

/** how long opening the database may take before the parent is told (another window may block it) */
const OPEN_TIMEOUT_MS = 15_000;

/** Shown instead of a mascot that thinks forever when the data cannot be opened (full device, blocked). */
function OpenFailed() {
  return (
    <main className="screen screen--center">
      <Mascot mood="thinking" size={160} />
      <p className="open-failed">{t('app.openFailed')}</p>
      <button type="button" className="parent-button primary" onClick={() => location.reload()}>
        {t('app.retry')}
      </button>
    </main>
  );
}

export function AppProvider({ children, audio, dbName, fallback }: AppProviderProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => !cancelled && setFailed(true), OPEN_TIMEOUT_MS);
    (async () => {
      const db = await openDb(dbName ? { name: dbName } : {});
      const settings = await ensureChild(db, defaultPosition());
      const child = (await db.children.get(DEFAULT_CHILD_ID))!;
      const service = audio ?? createBrowserAudioService(async (key) => (await db.recordings.get(key))?.blob, bundledUrl);
      clearTimeout(timer);
      if (!cancelled) setLoaded({ db, audio: service, child, settings, voice: null });
      const voice = await service.voice();
      if (!cancelled) setLoaded((l) => l && { ...l, voice });
    })().catch((e) => {
      console.error('open database', e);
      clearTimeout(timer);
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [audio, dbName]);

  const refresh = useCallback(async () => {
    if (!loaded) return;
    const [child, settings] = await Promise.all([loaded.db.children.get(DEFAULT_CHILD_ID), loaded.db.settings.get(DEFAULT_CHILD_ID)]);
    setLoaded((l) => l && { ...l, child: child ?? l.child, settings: settings ?? l.settings });
  }, [loaded]);

  const recheckVoice = useCallback(() => {
    if (!loaded) return;
    void loaded.audio.voice().then((voice) => setLoaded((l) => l && (l.voice?.name === voice?.name ? l : { ...l, voice })));
  }, [loaded]);

  const app = useMemo<App | null>(() => {
    if (!loaded) return null;
    const allow = makeContext(
      CONTENT.curriculum,
      { position: loaded.settings.upToPosition, extraFlags: loaded.settings.extraFlags, extraSkills: loaded.settings.extraSkills },
      CONTENT.words,
    );
    return { ...loaded, content: CONTENT, allow, refresh, recheckVoice };
  }, [loaded, refresh, recheckVoice]);

  if (!app) return failed ? <OpenFailed /> : <>{fallback}</>;
  return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
}
