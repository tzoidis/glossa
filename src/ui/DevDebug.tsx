// Dev-only diagnostics for tablet testing: open the app with ?debug.
// Shows why stations are or are not offered. Never shipped (guarded by import.meta.env.DEV).

import { useEffect, useState } from 'react';
import { useApp } from '../app/AppContext.tsx';
import { buildGenerateContext } from '../app/generateContext.ts';
import { isLocalGreek } from '../audio/AudioService.ts';
import { availableExercises, canGenerate, EXERCISES } from '../exercises/registry.ts';

export function DevDebug() {
  const app = useApp();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const read = () => setVoices(speechSynthesis.getVoices());
    read();
    const id = setInterval(read, 1000);
    return () => clearInterval(id);
  }, []);

  const availability = { position: app.settings.upToPosition, enabledExercises: app.settings.enabledExercises, hasLocalVoice: app.voice !== null };
  const offered = new Set(availableExercises(EXERCISES, availability).map((e) => e.module.id));
  const ctx = () => buildGenerateContext({ content: app.content, allow: app.allow, level: 1, recentWordIds: [], reviewQueue: [], seed: 1 });

  return (
    <pre className="dev-debug">
      {[
        `secure context: ${window.isSecureContext}  speechSynthesis: ${typeof speechSynthesis !== 'undefined'}`,
        `voice in use:${app.voice ? `${app.voice.name} (${app.voice.lang})` : 'none'}`,
        `position: ${app.settings.upToPosition}`,
        '',
        'exercises:',
        ...EXERCISES.map(
          (e) =>
            `  ${e.module.id}: requirements ${offered.has(e.module.id) ? 'ok' : 'NOT met'}, content ${canGenerate(e.module, ctx()) ? 'ok' : 'NOT enough'}, needs [${e.module.requires.needs.join(', ')}]`,
        ),
        '',
        `voices (${voices.length}):`,
        ...voices.map((v) => `  ${isLocalGreek(v) ? '*' : ' '} ${v.name} | ${v.lang} | local=${v.localService}`),
      ].join('\n')}
    </pre>
  );
}
