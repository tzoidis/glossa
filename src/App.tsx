import { lazy, Suspense, useState } from 'react';
import { AppProvider, useApp } from './app/AppContext.tsx';
import { MockAudioService } from './audio/MockAudioService.ts';
import { markLettersReturned, returningLetters } from './app/lettersReturn.ts';
import { Home } from './screens/Home.tsx';
import { LetterReturn } from './screens/LetterReturn.tsx';
import { Parent } from './screens/parent/Parent.tsx';
import { Session } from './screens/Session.tsx';
import { Start } from './screens/Start.tsx';
import { Village } from './screens/Village.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import { Mascot } from './ui/Mascot.tsx';

// ?try=… plays one game in dev (src/dev/TryScreen.tsx); not in the production build
const trying = import.meta.env.DEV && new URLSearchParams(location.search).has('try');
// ?fast (dev only): silent audio that ends at once, for the Playwright robot player (e2e/)
const silent = import.meta.env.DEV && new URLSearchParams(location.search).has('fast') ? new MockAudioService() : undefined;
const TryScreen = import.meta.env.DEV ? lazy(() => import('./dev/TryScreen.tsx')) : null;

type Screen =
  | { name: 'start' }
  | { name: 'home' }
  | { name: 'letters'; letters: string[] }
  | { name: 'session'; exerciseId: string }
  | { name: 'village' }
  | { name: 'parent'; from: 'start' | 'home' }
  | { name: 'try' };

function Screens() {
  const { settings, child, content, db, refresh } = useApp();
  const [screen, setScreen] = useState<Screen>(trying ? { name: 'try' } : { name: 'start' });
  // the welcome clip from «Πάμε!»: Home speaks only after it ends
  const [welcome, setWelcome] = useState<Promise<unknown> | null>(null);
  const home = () => setScreen({ name: 'home' });
  const village = () => setScreen({ name: 'village' });

  return (
    <div className={`app ${settings.leftHanded ? 'left-handed' : ''}`}>
      <ErrorBoundary onHome={home}>
        {screen.name === 'try' && TryScreen && (
          <Suspense fallback={null}>
            <TryScreen search={location.search} />
          </Suspense>
        )}
        {screen.name === 'start' && (
          <Start
            onGo={(w) => {
              setWelcome(w);
              const letters = returningLetters(content.order.order, settings.upToPosition, child);
              if (letters.length > 0) return setScreen({ name: 'letters', letters });
              // before the first round (or in units 5-7) the letters just count as found
              if (settings.upToPosition > (child.lettersReturned ?? 0)) void markLettersReturned(db, child.id, settings.upToPosition).then(refresh);
              home();
            }}
            onParent={() => setScreen({ name: 'parent', from: 'start' })}
          />
        )}
        {screen.name === 'letters' && (
          <LetterReturn
            letters={screen.letters}
            after={welcome}
            onDone={() => {
              setWelcome(null);
              void markLettersReturned(db, child.id, settings.upToPosition).then(refresh);
              home();
            }}
          />
        )}
        {screen.name === 'home' && (
          <Home
            after={welcome}
            onPlay={(exerciseId) => setScreen({ name: 'session', exerciseId })}
            onVillage={village}
            onParent={() => setScreen({ name: 'parent', from: 'home' })}
          />
        )}
        {screen.name === 'session' && <Session firstExerciseId={screen.exerciseId} onHome={home} onVillage={village} />}
        {screen.name === 'village' && <Village onHome={home} />}
        {/* back to «Πάμε!» when opened there: its tap is what unlocks the sound */}
        {screen.name === 'parent' && <Parent onClose={() => (screen.from === 'start' ? setScreen({ name: 'start' }) : home())} />}
      </ErrorBoundary>
    </div>
  );
}

export function App() {
  return (
    <AppProvider
      audio={silent}
      fallback={
        <main className="screen screen--center">
          <Mascot mood="thinking" />
        </main>
      }
    >
      <Screens />
    </AppProvider>
  );
}
