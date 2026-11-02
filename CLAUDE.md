# Glossa

Offline PWA with Greek reading games for a first-grade child, following the book «Η γλώσσα μας» (2025-26) letter by letter. The spec is `PRD – Παιχνίδι Γλώσσας Α' Δημοτικού.md`; read the relevant section before changing behavior.

## Commands

- `npm run dev` – Vite dev server
- `npm run dev:lan` – dev server reachable from the tablet on the home Wi-Fi (plain http: no secure-context APIs without a fallback)
- `npm test` – Vitest (`npm run test:watch` for watch mode)
- `npm run validate-content` – checks `src/content/*.json` (runs in CI)
- `npm run typecheck` – `tsc -b`
- `npm run build` – typecheck + production build
- `npm run ci` – everything CI runs, in order
- `npm run word-list` – regenerates `docs/word-list.md` (the parent's approval list) from `words.json`
- `npm run build && npm run preview` – production build with the service worker (the dev server has no service worker)
- `bash scripts/icons/render.sh` – re-renders the PNG app icons from `public/icon.svg` with headless Edge
- `python scripts/voice/generate.py` – re-creates the instruction and praise clips (`src/audio/files/`) from `audio.json` with the ElevenLabs voice «Eleni» (eleven_multilingual_v2, 24 kHz / 48 kbps); needs `pip install requests` in a separate venv, network, and the parent's paid-plan key in `~/.elevenlabs-key` (never in the repo). `--engine edge` uses the old free Athina voice. Run it after changing a phrase in `audio.json`.
- `python scripts/voice/generate.py --words [--only <id>]` – the word clips (`src/audio/files/word/<id>.mp3`); run after adding a word (`src/audio/bundled.test.ts` fails until every bank word has one).
- `node scripts/voice/syllable-list.ts > syllables.json` then `python scripts/voice/generate.py --syllables syllables.json --skip-existing` – makes the syllable clips (`src/audio/files/syllable/<sound key>.mp3`); run after adding words or letters. Rerun until nothing is missing.

Node ≥ 22.18 (scripts in `scripts/` run as plain `.ts` via Node type stripping, so use only erasable TS syntax there: no enums, namespaces or parameter properties).

## Rules

- **No network calls in app code.** No `fetch`, XHR, WebSocket, external URLs, analytics or cookies. Fonts, images, audio and voices are all local. `src/repoRules.test.ts` enforces this.
- **No new dependency without the user's approval.** The approved stack is in PRD §8 (Vite, React, TypeScript, Dexie, vite-plugin-pwa, dnd-kit, Vitest, Playwright), plus `fake-indexeddb` (dev only, approved for M2); add each only in the milestone that needs it.
- **NFC everywhere.** Normalize every text to NFC on input; content files must already be NFC (`validate-content` checks).
- **No Greek text hardcoded outside `src/content/`.** UI strings go in `src/content/ui.el.json` and are read with `t()` from `src/i18n.ts`. Test files are exempt. `src/repoRules.test.ts` enforces this.
- **The schemas in PRD §8 are the only source of truth** for `Word`, `Sentence`, `Story`, `Round`, `AnswerLog`, `ExerciseModule` and the Dexie tables.
- **Do not "fix" `curriculum.json` or word flags without asking.** Letter order and pronunciation flags come from the book and the parent.
- **The allowed-words rule (PRD §3) applies to every string that reaches the screen**: words, sentences, wrong choices, keyboard keys.
- **Every new exercise needs:** `requires`, a seeded property test, an audio instruction (file, not TTS), a first-time demo, and a tap alternative to every drag.
- The sound games use **syllables, not phonemes**: synthetic phonemes sound wrong (tried). Syllable clips are keyed by sound (`syllableSoundKey`: «τή», «τι» → `syllable/τι`) so homophone spellings share one clip.
- Every bank word, syllable, instruction and praise ships as a clip in one voice (Eleni). Device TTS is only a fallback for text without a clip (future sentences), only with a local `el-GR` voice; never for phonemes or letter names.
- Reading material is never played automatically.

## PWA

- vite-plugin-pwa, `registerType: 'prompt'`: a new version waits and is applied only on the start screen or from the parent screen (`src/app/appUpdate.ts`), never mid-round.
- Everything is precached, including bundled recordings in `src/audio/files/`; `base: './'` so the build works at a domain root or a subpath.
- `navigator.storage.persist()` runs at startup when installed.
- Hosted at https://tzoidis.github.io/glossa/ (repo `tzoidis/glossa`, public). Every push to `main` runs CI and, if it passes, deploys `dist/` to GitHub Pages (`.github/workflows/ci.yml`).
- Manual tablet checks: `docs/tablet-checklist.md`.

## Engine conventions

- **Position** = number of graphemes taught, counted along `curriculum.json` order (0 = transition only, 1 = «α» taught, …). `Word.minPosition` uses the same scale.
- Linguistic tables (multigraphs, vowels, homophone groups, flag triggers) live in `src/content/greek.json`, not in code.
- Sight words bypass both grapheme and flag checks (they are read whole; «έχει» has soft-g-ch). Diaeresis is a separate skill, `diaeresis`.
- Flags of bank words come from `words.json` and must match `detectFlags(text, syllables)`; `validate-content` reports a mismatch, and you ask before changing either. Free text uses detection without syllables, which errs on the strict side.
- `src/content/capacity.json` lists what each exercise shows and the positions (`checkpoints`) where capacity must reach the minimum. Engine code imported by `scripts/` must be erasable TS and use `with { type: 'json' }` for JSON imports.

## Session conventions

- Exercises register in `src/exercises/registry.ts` with a `mechanism` (station variety) and an `icon` (OpenMoji code, never a Latin-letter emoji). An exercise is offered only if `generate` does not throw `NotEnoughContent`.
- Pattern to copy for new exercises: `src/exercises/firstLetter/` and `joinSyllables/` — `generate.ts` (pure, uses `pickWords`/`isReadable` from `pool.ts`), the component (feedback: wrong choice fades, word replays slowly, right one glows, child makes the right move; log attempt 1 and, after a mistake, attempt 2), `index.ts`, and a property test over `cases()` from `propertyTest.ts`.
- First-time demo: `RoundPlayer` wraps one practice item in `DemoProvider`; components render `<Hand />` on the right target when `useDemo()` is true. Drags use `useDragOrTap` so a tap always works too.
- `AnswerLog.itemId` is also the review-queue key: `word:<wordId>` or `grapheme:<g>` (helpers in `src/exercises/answer.ts`). Exercises leave `childId` empty; the session fills it.
- The pure session flow is `src/engine/session.ts`; persistence of answers, review queue, village items and stars is `src/storage/progress.ts`.
- `Picture` renders the OpenMoji code with the device emoji font until the OpenMoji subset is bundled.

## Layout

```
src/
  content/    curriculum.json, words.json, sentences.json, stories.json, ui.el.json
  engine/     tokenizer, allowed words, round generator, adaptive, review queue, rng
  exercises/  one folder per exercise type (shared ExerciseModule interface)
  audio/      AudioService (+ MockAudioService), recordings list, bundled files
    files/    <kind>/<key>.<ext> clips shipped in the app (instruction/welcome.mp3, praise/1.mp3, syllable/σα.mp3)
  screens/    Start, Home, Village, Session, Parent
  storage/    Dexie db, migrations (append-only; openDb snapshots before upgrading), backup
scripts/      validate-content.ts, build-openmoji-subset.ts
```

## Milestones (PRD §9)

M0 scaffold/CI/CLAUDE.md · M1 tokenizer, allowed-words rule, validate-content with capacity · M2 schemas, Dexie, AudioService mock · M3 Start/Home/Village/session flow · M4 two prototype exercises · M5 remaining MVP exercises · M6 parent screen, export/import · M7 PWA/offline, `persist()`, tablet checklist.
