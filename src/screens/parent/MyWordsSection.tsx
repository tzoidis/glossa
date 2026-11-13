// «Δικές μου λέξεις» (PRD §7): the child's name or words from home. A name from
// names.json keeps its id, so its clip in the games' voice plays; any other word
// can be recorded by the parent (recordings table, key word/<id>), else the
// device voice says it. A photo or an OpenMoji picture lets it join the games
// with pictures; it reaches the games once its letters are taught (PRD §3).

import { useMemo, useRef, useState } from 'react';
import greek from '../../content/greek.json' with { type: 'json' };
import { useApp } from '../../app/AppContext.tsx';
import { NAMES } from '../../app/content.ts';
import { bundledUrl } from '../../audio/bundled.ts';
import { canRecord, useRecorder } from '../../audio/recorder.ts';
import { audioKey } from '../../audio/recordings.ts';
import { t } from '../../i18n.ts';
import { articleByEnding } from '../../exercises/article/generate.ts';
import { DEFAULT_CHILD_ID, type CustomWord } from '../../storage/schema.ts';
import { bundledPictureCodes, Picture } from '../../ui/Picture.tsx';
import { isTaken, parseInput, whenReadable, type Kind } from './myWords.ts';
import { PEOPLE_AND_PETS, photoDataUrl } from './photo.ts';

type Article = CustomWord['article'];
const ARTICLES = greek.articles as NonNullable<Article>[];

const newId = () => `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function WordRow({ word, onRemove }: { word: CustomWord; onRemove(): void }) {
  const { audio, content, allow, settings } = useApp();
  const analyzed = content.wordsById.get(word.id);
  const when = useMemo(() => whenReadable(word.text, settings.upToPosition, content, allow), [word.text, settings.upToPosition, content, allow]);
  return (
    <li className="my-word">
      {analyzed?.imageId ? <Picture imageId={analyzed.imageId} size={56} /> : <span className="my-word-blank" />}
      <span className="my-word-text">
        <strong>{word.text}</strong>
        <span className="help">
          {when.now
            ? t('parent.words.now')
            : 'grapheme' in when
              ? t('parent.words.from', { g: when.grapheme })
              : 'unit' in when
                ? t('parent.words.fromUnit', { n: when.unit })
                : t('parent.words.never')}
        </span>
      </span>
      <button type="button" className="parent-button" onClick={() => void audio.play({ kind: 'word', key: word.id, text: word.text })}>
        {t('parent.audio.play')}
      </button>
      <button type="button" className="parent-button subtle" onClick={() => window.confirm(t('parent.words.removeConfirm', { w: word.text })) && onRemove()}>
        {t('parent.words.remove')}
      </button>
    </li>
  );
}

function AddWord({ kind, onDone }: { kind: Kind; onDone(): void }) {
  const { db, audio, content, voice, refresh } = useApp();
  const recorder = useRecorder();
  const [input, setInput] = useState('');
  // undefined until the parent picks one: then the ending suggests it (σκυλάκι → το)
  const [article, setArticle] = useState<Article | undefined>(undefined);
  const [imageId, setImageId] = useState<string | null>(kind === 'name' ? '1F9D2' : null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [picking, setPicking] = useState(false);
  const [recording, setRecording] = useState<{ blob: Blob; mimeType: string } | null>(null);
  const draftId = useRef(newId());
  const fileInput = useRef<HTMLInputElement>(null);

  const parsed = parseInput(input, kind);
  const listed = parsed.ok ? parsed.listed : undefined;
  const id = listed?.id ?? draftId.current;
  const taken = parsed.ok && isTaken(parsed.text, content);
  // a listed name brings its own article; any other name the parent's choice
  const chosenArticle: Article = listed ? listed.article : article !== undefined ? article : parsed.ok ? (articleByEnding(parsed.text) as Article) : null;
  const hasBundledClip = !!bundledUrl(audioKey('word', id));
  const pictures = useMemo(() => [...PEOPLE_AND_PETS, ...bundledPictureCodes().filter((c) => !PEOPLE_AND_PETS.includes(c))], []);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPhoto(await photoDataUrl(file));
      setPhotoFailed(false);
    } catch {
      setPhotoFailed(true);
    }
  };

  const toggleRecording = async () => {
    if (recorder.state !== 'recording') return recorder.start();
    const result = await recorder.stop();
    if (result) setRecording(result);
  };

  const playDraft = () => {
    if (recording) return void new Audio(URL.createObjectURL(recording.blob)).play();
    if (parsed.ok) void audio.play({ kind: 'word', key: id, text: parsed.text });
  };

  const save = async () => {
    if (!parsed.ok || taken) return;
    const word: CustomWord = {
      id,
      childId: DEFAULT_CHILD_ID,
      text: parsed.text,
      article: chosenArticle,
      syllables: parsed.syllables,
      kind,
      ...(imageId && !photo ? { imageId } : {}),
      ...(photo ? { photo } : {}),
      createdAt: Date.now(),
    };
    await db.transaction('rw', db.customWords, db.recordings, async () => {
      await db.customWords.put(word);
      if (recording) await db.recordings.put({ key: audioKey('word', id), blob: recording.blob, mimeType: recording.mimeType, createdAt: Date.now() });
    });
    await refresh();
    onDone();
  };

  const voiceNote = hasBundledClip
    ? t('parent.words.voice.bundled')
    : recording
      ? t('parent.words.voice.recorded')
      : voice
        ? t('parent.words.voice.device')
        : t('parent.words.voice.none');

  return (
    <div className="my-word-form">
      <label className="field">
        <span>{t(kind === 'name' ? 'parent.words.nameLabel' : 'parent.words.wordLabel')}</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          list={kind === 'name' ? 'glossa-names' : undefined}
          autoCapitalize={kind === 'name' ? 'words' : 'none'}
          autoComplete="off"
          spellCheck={false}
          lang="el"
        />
      </label>
      {kind === 'name' && (
        <datalist id="glossa-names">
          {NAMES.map((n) => (
            <option key={n.id} value={n.text} />
          ))}
        </datalist>
      )}
      <p className="help">{t(kind === 'name' ? 'parent.words.nameHint' : 'parent.words.wordHint')}</p>
      {parsed.ok && <p className="help">{t('parent.words.syllables', { s: parsed.syllables.join(' - ') })}</p>}
      {parsed.ok && parsed.warn && <p className="warn-text">{t(parsed.warn === 'hyphens' ? 'parent.words.hyphens' : 'parent.words.noAccent')}</p>}
      {!parsed.ok && parsed.error === 'invalid' && <p className="warn-text">{t('parent.words.invalid')}</p>}
      {taken && <p className="warn-text">{t('parent.words.exists')}</p>}

      {!listed && (
        <label className="field">
          <span>{t('parent.words.article')}</span>
          <select value={chosenArticle ?? ''} onChange={(e) => setArticle((e.target.value || null) as Article)}>
            {ARTICLES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            <option value="">{t('parent.words.noArticle')}</option>
          </select>
        </label>
      )}

      <div className="field">
        <span>{t('parent.words.picture')}</span>
        <div className="my-word-picture">
          {photo ? <img className="my-word-photo" src={photo} alt="" /> : imageId ? <Picture imageId={imageId} size={72} /> : null}
          <button type="button" className="parent-button" onClick={() => fileInput.current?.click()}>
            {t('parent.words.photo')}
          </button>
          <button type="button" className="parent-button" onClick={() => setPicking((p) => !p)}>
            {t('parent.words.icon')}
          </button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => void pickPhoto(e.target.files?.[0])} />
        </div>
        {photo && <p className="help">{t('parent.words.photoNote')}</p>}
        {photoFailed && <p className="warn-text">{t('parent.words.photoFailed')}</p>}
        {!photo && !imageId && <p className="help">{t('parent.words.noPicture')}</p>}
        {picking && (
          <div className="picture-picker">
            {pictures.map((code) => (
              <button
                key={code}
                type="button"
                className={`picture-choice ${code === imageId && !photo ? 'chosen' : ''}`}
                onClick={() => {
                  setImageId(code);
                  setPhoto(null);
                  setPicking(false);
                }}
              >
                <Picture imageId={code} size={48} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <p className="help">{voiceNote}</p>
        <div className="my-word-picture">
          {parsed.ok && (
            <button type="button" className="parent-button" onClick={playDraft}>
              {t('parent.audio.play')}
            </button>
          )}
          {!hasBundledClip && canRecord() && (
            <button type="button" className={`parent-button ${recorder.state === 'recording' ? 'recording' : ''}`} onClick={() => void toggleRecording()}>
              {recorder.state === 'recording' ? t('parent.audio.stop') : t('parent.audio.record')}
            </button>
          )}
        </div>
        {recorder.state === 'error' && <p className="warn-text">{t('parent.audio.noMic')}</p>}
      </div>

      <div className="my-word-picture">
        <button type="button" className="parent-button primary" disabled={!parsed.ok || taken} onClick={() => void save()}>
          {t('parent.words.save')}
        </button>
        <button type="button" className="parent-button subtle" onClick={onDone}>
          {t('parent.words.cancel')}
        </button>
      </div>
    </div>
  );
}

export function MyWordsSection() {
  const { db, customWords, refresh } = useApp();
  const [adding, setAdding] = useState<Kind | null>(null);

  const remove = async (w: CustomWord) => {
    await db.transaction('rw', db.customWords, db.recordings, db.world, async () => {
      await db.customWords.delete(w.id);
      await db.recordings.delete(audioKey('word', w.id));
      // a village item of a word that is gone would show its id
      await db.world.where('childId').equals(w.childId).filter((i) => i.kind === 'word' && i.ref === w.id).delete();
    });
    await refresh();
  };

  return (
    <section className="parent-card">
      <h2>{t('parent.section.words')}</h2>
      <p className="help">{t('parent.words.help')}</p>
      <p className="help">{t('parent.words.namesNote')}</p>
      {customWords.length === 0 ? (
        <p className="help">{t('parent.words.empty')}</p>
      ) : (
        <ul className="my-words">
          {customWords.map((w) => (
            <WordRow key={w.id} word={w} onRemove={() => void remove(w)} />
          ))}
        </ul>
      )}
      {adding ? (
        <AddWord key={adding} kind={adding} onDone={() => setAdding(null)} />
      ) : (
        <div className="my-word-picture">
          <button type="button" className="parent-button primary" onClick={() => setAdding('name')}>
            {t('parent.words.addName')}
          </button>
          <button type="button" className="parent-button" onClick={() => setAdding('word')}>
            {t('parent.words.addWord')}
          </button>
        </div>
      )}
    </section>
  );
}
