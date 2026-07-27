import { canonicalCell, latLonToGrid } from './geo';

const STORAGE_KEY = 'jomo26:here';

export type CellSource = 'manual' | 'gps';

export const CELL_SOURCE: CellSource = import.meta.env.VITE_PRESENCE_SOURCE === 'gps' ? 'gps' : 'manual';

const listeners = new Set<() => void>();

let currentCell = CELL_SOURCE === 'manual' ? readStoredCell() : null;
let watchId: number | null = null;

function readStoredCell() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? canonicalCell(stored) : null;
  } catch {
    return null;
  }
}

function setSnapshot(nextCell: string | null) {
  if (currentCell === nextCell) return;
  currentCell = nextCell;
  listeners.forEach((listener) => listener());
}

export function gridCellForCoordinates(latitude: number, longitude: number) {
  const position = latLonToGrid(latitude, longitude);
  const column = Math.floor(position.col);
  const row = Math.floor(position.row);

  if (column < 0 || column > 25 || row < 0 || row > 25) return null;

  return `${String.fromCharCode(65 + column)}${row + 1}`;
}

function startGpsWatch() {
  if (watchId !== null || typeof navigator === 'undefined' || !('geolocation' in navigator)) return;

  try {
    watchId = navigator.geolocation.watchPosition(
      (position) => setSnapshot(gridCellForCoordinates(position.coords.latitude, position.coords.longitude)),
      () => setSnapshot(null),
      { enableHighAccuracy: false }
    );
  } catch {
    setSnapshot(null);
  }
}

function stopGpsWatch() {
  if (watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(watchId);
  }
  watchId = null;
  setSnapshot(null);
}

export function getCurrentCell(): string | null {
  return currentCell;
}

export function setCurrentCell(code: string | null): void {
  if (CELL_SOURCE !== 'manual') return;

  const normalizedCode = code === null ? null : canonicalCell(code);
  if (code !== null && !normalizedCode) return;

  try {
    if (normalizedCode) {
      localStorage.setItem(STORAGE_KEY, normalizedCode);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // The selected cell still works for this session when storage is unavailable.
  }
  setSnapshot(normalizedCode);
}

export function subscribeCurrentCell(listener: () => void): () => void {
  listeners.add(listener);
  if (CELL_SOURCE === 'gps' && listeners.size === 1) startGpsWatch();

  return () => {
    listeners.delete(listener);
    if (CELL_SOURCE === 'gps' && listeners.size === 0) stopGpsWatch();
  };
}

export function getCurrentCellSnapshot(): string | null {
  return currentCell;
}
