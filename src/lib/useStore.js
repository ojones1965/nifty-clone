import { useSyncExternalStore } from 'react';
import { subscribe, getVersion } from './storage.js';

// Re-render the component whenever any store data changes. The snapshot is a
// monotonically increasing version number, so components read fresh data from
// the store getters (listItems() etc.) on each render.
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, getVersion);
}
