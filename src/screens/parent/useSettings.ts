import { useCallback } from 'react';
import { useApp } from '../../app/AppContext.tsx';
import type { Settings } from '../../storage/schema.ts';

/** Writes a settings change and makes the whole app see it at once (PRD §9: content changes immediately). */
export function useUpdateSettings() {
  const { db, child, refresh } = useApp();
  return useCallback(
    async (patch: Partial<Omit<Settings, 'childId'>>) => {
      await db.settings.update(child.id, patch);
      await refresh();
    },
    [db, child.id, refresh],
  );
}
