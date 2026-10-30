// Sound settings (PRD §6, §7): the voice in use, which recordings are missing,
// the syllable check, and recording/playing/deleting each one.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext.tsx';
import { bundledKeys } from '../../audio/bundled.ts';
import { canRecord, useRecorder } from '../../audio/recorder.ts';
import { audioKey, requiredRecordings, type AudioKind, type RequiredRecording } from '../../audio/recordings.ts';
import { lowerKey } from '../../engine/greekTokenizer.ts';
import { t, type UiKey } from '../../i18n.ts';

type Source = 'recorded' | 'bundled' | 'missing';

function RecordingRow({ item, source, onChange }: { item: { key: string; kind: AudioKind; text: string }; source: Source; onChange(): void }) {
  const { db, audio } = useApp();
  const recorder = useRecorder();
  const [, key] = item.key.split(/\/(.*)/s);

  const toggleRecording = async () => {
    if (recorder.state !== 'recording') return recorder.start();
    const result = await recorder.stop();
    if (!result) return;
    await db.recordings.put({ key: item.key, blob: result.blob, mimeType: result.mimeType, createdAt: Date.now() });
    onChange();
  };

  return (
    <li className="recording-row">
      <span className="recording-text">{item.text}</span>
      <span className={`status status--${source === 'missing' ? 'warn' : 'ok'}`}>
        {t(source === 'recorded' ? 'parent.audio.recorded' : source === 'bundled' ? 'parent.audio.bundled' : 'parent.audio.missingOne')}
      </span>
      <button type="button" className="parent-button" onClick={() => void audio.play({ kind: item.kind, key: key ?? '', text: item.kind === 'syllable' ? item.text : undefined })}>
        {t('parent.audio.play')}
      </button>
      {canRecord() && (
        <button type="button" className={`parent-button ${recorder.state === 'recording' ? 'recording' : ''}`} onClick={() => void toggleRecording()}>
          {recorder.state === 'recording' ? t('parent.audio.stop') : t('parent.audio.record')}
        </button>
      )}
      {source === 'recorded' && (
        <button
          type="button"
          className="parent-button subtle"
          onClick={() => void db.recordings.delete(item.key).then(onChange)}
        >
          {t('parent.audio.delete')}
        </button>
      )}
      {recorder.state === 'error' && <span className="status status--warn">{t('parent.audio.noMic')}</span>}
    </li>
  );
}

export function AudioSection() {
  const { db, voice, content, refresh } = useApp();
  const [recorded, setRecorded] = useState<Set<string>>(new Set());
  const bundled = useMemo(() => new Set(bundledKeys()), []);

  const reload = useCallback(async () => {
    setRecorded(new Set((await db.recordings.toCollection().primaryKeys()) as string[]));
    await refresh(); // a new phoneme may unlock the sound games
  }, [db, refresh]);

  useEffect(() => {
    void db.recordings
      .toCollection()
      .primaryKeys()
      .then((keys) => setRecorded(new Set(keys as string[])));
  }, [db]);

  const sourceOf = (key: string): Source => (recorded.has(key) ? 'recorded' : bundled.has(key) ? 'bundled' : 'missing');
  const required = requiredRecordings(content.curriculum);
  const missing = required.filter((r) => sourceOf(r.key) === 'missing').length;
  const syllables = useMemo(
    () => [...new Set(content.words.flatMap((w) => w.syllables.map(lowerKey)))].sort((a, b) => a.localeCompare(b, 'el')),
    [content.words],
  );

  const group = (kind: RequiredRecording['kind']) => required.filter((r) => r.kind === kind);

  return (
    <section className="parent-card">
      <h2>{t('parent.section.audio')}</h2>
      <p>{voice ? t('parent.audio.voice', { name: `${voice.name} (${voice.lang})` }) : t('parent.audio.noVoice')}</p>
      <p className={missing ? 'warn-text' : ''}>{missing ? t('parent.audio.missing', { n: missing }) : t('parent.audio.complete')}</p>
      {!canRecord() && <p className="warn-text">{t('parent.audio.noMic')}</p>}

      {(['phoneme', 'instruction', 'praise'] as const).map((kind) => (
        <details key={kind} open={kind === 'phoneme' && missing > 0}>
          <summary>{t(`parent.audio.kind.${kind}` as UiKey)}</summary>
          <ul className="parent-list">
            {group(kind).map((r) => (
              <RecordingRow key={r.key} item={r} source={sourceOf(r.key)} onChange={() => void reload()} />
            ))}
          </ul>
        </details>
      ))}

      <details>
        <summary>{t('parent.audio.syllables')}</summary>
        <p className="help">{t('parent.audio.syllablesHelp')}</p>
        <ul className="parent-list">
          {syllables.map((s) => {
            const key = audioKey('syllable', s);
            return <RecordingRow key={key} item={{ key, kind: 'syllable', text: s }} source={recorded.has(key) ? 'recorded' : 'bundled'} onChange={() => void reload()} />;
          })}
        </ul>
      </details>
    </section>
  );
}
