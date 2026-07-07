import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'jomo26:favorites';

function readFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(readFavorites);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

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
