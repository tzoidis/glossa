import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { isInstalled, persistIfInstalled, startServiceWorker } from './app/appUpdate.ts';
import './index.css';

startServiceWorker();
void persistIfInstalled(isInstalled());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
