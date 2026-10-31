import { useState } from 'react';
import { AppProvider, useApp } from './app/AppContext.tsx';
import { Home } from './screens/Home.tsx';
import { Parent } from './screens/parent/Parent.tsx';
import { Session } from './screens/Session.tsx';
import { Start } from './screens/Start.tsx';
import { Village } from './screens/Village.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import { Mascot } from './ui/Mascot.tsx';

type Screen = { name: 'start' } | { name: 'home' } | { name: 'session'; exerciseId: string } | { name: 'village' } | { name: 'parent' };

function Screens() {
  const { settings } = useApp();
  const [screen, setScreen] = useState<Screen>({ name: 'start' });
  // the welcome clip from «Πάμε!»: Home speaks only after it ends
  const [welcome, setWelcome] = useState<Promise<unknown> | null>(null);
  const home = () => setScreen({ name: 'home' });
  const village = () => setScreen({ name: 'village' });

  return (
    <div className={`app ${settings.leftHanded ? 'left-handed' : ''}`}>
      <ErrorBoundary onHome={home}>
        {screen.name === 'start' && (
          <Start
            onGo={(w) => {
              setWelcome(w);
              home();
            }}
          />
        )}
        {screen.name === 'home' && (
          <Home
            after={welcome}
            onPlay={(exerciseId) => setScreen({ name: 'session', exerciseId })}
            onVillage={village}
            onParent={() => setScreen({ name: 'parent' })}
          />
        )}
        {screen.name === 'session' && <Session firstExerciseId={screen.exerciseId} onHome={home} onVillage={village} />}
        {screen.name === 'village' && <Village onHome={home} />}
        {screen.name === 'parent' && <Parent onClose={home} />}
      </ErrorBoundary>
    </div>
  );
}

export function App() {
  return (
    <AppProvider
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
