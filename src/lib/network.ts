type NetworkConnection = {
  effectiveType?: string;
  saveData?: boolean;
};

const LOW_SIGNAL_STORAGE_KEY = 'jomo26:low-signal';
const lowSignalListeners = new Set<() => void>();

function readLowSignalMode() {
  try {
    return localStorage.getItem(LOW_SIGNAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

let lowSignalMode = readLowSignalMode();

function getConnection(): NetworkConnection | undefined {
  if (typeof navigator === 'undefined') return undefined;

  return (navigator as Navigator & { connection?: NetworkConnection }).connection;
}

export function isSaveData() {
  return getConnection()?.saveData === true;
}

export function isSlowConnection() {
  const effectiveType = getConnection()?.effectiveType;

  return isSaveData() || effectiveType === 'slow-2g' || effectiveType === '2g';
}

export function isLowSignalMode() {
  return lowSignalMode;
}

export function setLowSignalMode(on: boolean) {
  if (lowSignalMode === on) return;

  lowSignalMode = on;
  try {
    if (on) {
      localStorage.setItem(LOW_SIGNAL_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(LOW_SIGNAL_STORAGE_KEY);
    }
  } catch {
    // Keep the in-memory choice usable when storage is unavailable.
  }
  lowSignalListeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  lowSignalListeners.add(listener);
  return () => {
    lowSignalListeners.delete(listener);
  };
}

export function getSnapshot() {
  return lowSignalMode;
}

export function canSpendBandwidth() {
  return !isLowSignalMode() && typeof navigator !== 'undefined' && navigator.onLine && !isSlowConnection();
}
