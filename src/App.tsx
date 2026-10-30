import { useState } from 'react';
import { AppProvider } from './app/AppContext.tsx';
import { Home } from './screens/Home.tsx';
import { Session } from './screens/Session.tsx';
import { Start } from './screens/Start.tsx';
import { Village } from './screens/Village.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import { Mascot } from './ui/Mascot.tsx';

type Screen = { name: 'start' } | { name: 'home' } | { name: 'session'; exerciseId: string } | { name: 'village' };

function Screens() {
  const [screen, setScreen] = useState<Screen>({ name: 'start' });
  const home = () => setScreen({ name: 'home' });
  const village = () => setScreen({ name: 'village' });

  return (
    <ErrorBoundary onHome={home}>
      {screen.name === 'start' && <Start onGo={home} />}
      {screen.name === 'home' && <Home onPlay={(exerciseId) => setScreen({ name: 'session', exerciseId })} onVillage={village} />}
      {screen.name === 'session' && <Session firstExerciseId={screen.exerciseId} onHome={home} onVillage={village} />}
      {screen.name === 'village' && <Village onHome={home} />}
    </ErrorBoundary>
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
