import { useSyncExternalStore } from 'react';
import { applyUpdate, checkForUpdate, getSnapshot, subscribe } from '../lib/pwa';

const serverSnapshot = { needRefresh: false };

export function usePwaUpdate() {
  const { needRefresh } = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);

  return { needRefresh, applyUpdate, checkForUpdate };
}
