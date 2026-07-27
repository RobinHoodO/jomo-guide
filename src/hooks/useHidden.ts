import { useEffect, useMemo, useState } from 'react';

// Mirrors useFavorites: ids the user swiped away, persisted on this phone.
const DEFAULT_STORAGE_KEY = 'jomo26:hidden';

function readHidden(storageKey: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function useHidden(storageKey = DEFAULT_STORAGE_KEY) {
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => readHidden(storageKey));

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(hiddenIds));
  }, [hiddenIds, storageKey]);

  return useMemo(() => {
    const hiddenSet = new Set(hiddenIds);
    return {
      hiddenIds,
      isHidden: (id: string) => hiddenSet.has(id),
      hide: (id: string) => {
        setHiddenIds((current) => (current.includes(id) ? current : [...current, id]));
      },
      unhide: (id: string) => {
        setHiddenIds((current) => current.filter((item) => item !== id));
      },
      unhideAll: () => setHiddenIds([])
    };
  }, [hiddenIds]);
}
