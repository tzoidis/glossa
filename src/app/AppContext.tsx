// App-wide services: database, settings, audio, content.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createBrowserAudioService, type AudioService, type VoiceInfo } from '../audio/AudioService.ts';
import { bundledKeys, bundledUrl } from '../audio/bundled.ts';
import { requiredRecordings } from '../audio/recordings.ts';
import { makeContext, type AllowContext } from '../engine/allowedWords.ts';
import { ensureChild, openDb, type GlossaDb } from '../storage/db.ts';
import { DEFAULT_CHILD_ID, type Child, type Settings } from '../storage/schema.ts';
import { CONTENT, defaultPosition, type Content } from './content.ts';

export interface App {
  db: GlossaDb;
  audio: AudioService;
  content: Content;
  child: Child;
  settings: Settings;
  allow: AllowContext;
  voice: VoiceInfo | null;
  /** every letter sound is recorded (bundled or by the parent): needed by sound exercises */
  hasPhonemeAudio: boolean;
  /** re-read child and settings after a write */
  refresh(): Promise<void>;
  /** look for the local voice again (call after the first tap: iOS may only list voices then) */
  recheckVoice(): void;
}

async function allPhonemesRecorded(db: GlossaDb): Promise<boolean> {
  const have = new Set([...bundledKeys(), ...((await db.recordings.toCollection().primaryKeys()) as string[])]);
  return requiredRecordings(CONTENT.curriculum)
    .filter((r) => r.kind === 'phoneme')
    .every((r) => have.has(r.key));
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
  hasPhonemeAudio: boolean;
}

export interface AppProviderProps {
  children: ReactNode;
  /** tests and the smoke test inject their own */
  audio?: AudioService;
  dbName?: string;
  fallback: ReactNode;
}

export function AppProvider({ children, audio, dbName, fallback }: AppProviderProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await openDb(dbName ? { name: dbName } : {});
      const settings = await ensureChild(db, defaultPosition());
      const child = (await db.children.get(DEFAULT_CHILD_ID))!;
      const service = audio ?? createBrowserAudioService(async (key) => (await db.recordings.get(key))?.blob, bundledUrl);
      const hasPhonemeAudio = await allPhonemesRecorded(db);
      if (!cancelled) setLoaded({ db, audio: service, child, settings, voice: null, hasPhonemeAudio });
      const voice = await service.voice();
      if (!cancelled) setLoaded((l) => l && { ...l, voice });
    })();
    return () => {
      cancelled = true;
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

  if (!app) return <>{fallback}</>;
  return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
}
