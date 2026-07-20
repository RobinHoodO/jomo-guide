import { useEffect, useMemo, useState } from 'react';

// Mirrors useFavorites: ids the user swiped away, persisted on this phone.
const STORAGE_KEY = 'jomo26:hidden';

function readHidden() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function useHidden() {
  const [hiddenIds, setHiddenIds] = useState<string[]>(readHidden);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenIds));
  }, [hiddenIds]);

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
