// Service worker and app updates (PRD §7, §8). A new version is downloaded in the
// background but applied only on the start screen, the station choice at home or
// from the parent screen, never in the middle of a round. A tablet may keep the app
// open for days, so it also looks for a new version whenever the app comes back to
// the front (at most every half hour).

import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

let updateReady = false;
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<() => void>();
const CHECK_EVERY_MS = 30 * 60_000;
let lastCheck = Date.now();

export function startServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  applyUpdate = registerSW({
    onNeedRefresh() {
      updateReady = true;
      listeners.forEach((l) => l());
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || Date.now() - lastCheck < CHECK_EVERY_MS) return;
        lastCheck = Date.now();
        // the browser fetches the service worker script itself; offline it simply fails
        void registration.update().catch(() => {});
      });
    },
  });
}

export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => updateReady,
  );
}

/** Installs the waiting version and reloads. Call only where no round is running. */
export function installUpdate(): void {
  void applyUpdate?.(true);
}

export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** PRD §7: once installed, ask the browser never to evict our data. */
export async function persistIfInstalled(installed: boolean): Promise<boolean | null> {
  if (!installed || !navigator.storage?.persist) return null;
  return (await navigator.storage.persisted()) || navigator.storage.persist();
}
