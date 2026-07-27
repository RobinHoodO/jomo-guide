import { useEffect, useMemo, useState } from 'react';

const DEFAULT_STORAGE_KEY = 'jomo26:favorites';

function readFavorites(storageKey: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function useFavorites(storageKey = DEFAULT_STORAGE_KEY) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavorites(storageKey));

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(favoriteIds));
  }, [favoriteIds, storageKey]);

  return useMemo(() => {
    const favoriteSet = new Set(favoriteIds);
    return {
      favoriteIds,
      favoriteSet,
      isFavorite: (id: string) => favoriteSet.has(id),
      toggleFavorite: (id: string) => {
        setFavoriteIds((current) =>
          current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
        );
      }
    };
  }, [favoriteIds]);
}
