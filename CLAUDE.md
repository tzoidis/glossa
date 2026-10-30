# Glossa

Offline PWA with Greek reading games for a first-grade child, following the book «Η γλώσσα μας» (2025-26) letter by letter. The spec is `PRD – Παιχνίδι Γλώσσας Α' Δημοτικού.md`; read the relevant section before changing behavior.

## Commands

- `npm run dev` – Vite dev server
- `npm test` – Vitest (`npm run test:watch` for watch mode)
- `npm run validate-content` – checks `src/content/*.json` (runs in CI)
- `npm run typecheck` – `tsc -b`
- `npm run build` – typecheck + production build
- `npm run ci` – everything CI runs, in order

Node ≥ 22.18 (scripts in `scripts/` run as plain `.ts` via Node type stripping, so use only erasable TS syntax there: no enums, namespaces or parameter properties).

## Rules

- **No network calls in app code.** No `fetch`, XHR, WebSocket, external URLs, analytics or cookies. Fonts, images, audio and voices are all local. `src/repoRules.test.ts` enforces this.
- **No new dependency without the user's approval.** The approved stack is in PRD §8 (Vite, React, TypeScript, Dexie, vite-plugin-pwa, dnd-kit, Vitest, Playwright); add each only in the milestone that needs it.
- **NFC everywhere.** Normalize every text to NFC on input; content files must already be NFC (`validate-content` checks).
- **No Greek text hardcoded outside `src/content/`.** UI strings go in `src/content/ui.el.json` and are read with `t()` from `src/i18n.ts`. Test files are exempt. `src/repoRules.test.ts` enforces this.
- **The schemas in PRD §8 are the only source of truth** for `Word`, `Sentence`, `Story`, `Round`, `AnswerLog`, `ExerciseModule` and the Dexie tables.
- **Do not "fix" `curriculum.json` or word flags without asking.** Letter order and pronunciation flags come from the book and the parent.
- **The allowed-words rule (PRD §3) applies to every string that reaches the screen**: words, sentences, wrong choices, keyboard keys.
- **Every new exercise needs:** `requires`, a seeded property test, an audio instruction (file, not TTS), a first-time demo, and a tap alternative to every drag.
- TTS is only for whole words and sentences, only with a local `el-GR` voice; never for phonemes or letter names.
- Reading material is never played automatically.

## Layout

```
src/
  content/    curriculum.json, words.json, sentences.json, stories.json, ui.el.json
  engine/     tokenizer, allowed words, round generator, adaptive, review queue, rng
  exercises/  one folder per exercise type (shared ExerciseModule interface)
  audio/      AudioService, recordings
  screens/    Start, Home, Village, Session, Parent
  storage/    Dexie db, migrations, backup
public/audio/ phonemes, instructions, praise (static files)
scripts/      validate-content.ts, build-openmoji-subset.ts
```

## Milestones (PRD §9)

M0 scaffold/CI/CLAUDE.md · M1 tokenizer, allowed-words rule, validate-content with capacity · M2 schemas, Dexie, AudioService mock · M3 Start/Home/Village/session flow · M4 two prototype exercises · M5 remaining MVP exercises · M6 parent screen, export/import · M7 PWA/offline, `persist()`, tablet checklist.
