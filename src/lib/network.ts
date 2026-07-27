type NetworkConnection = {
  effectiveType?: string;
  saveData?: boolean;
};

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

export function canSpendBandwidth() {
  return typeof navigator !== 'undefined' && navigator.onLine && !isSlowConnection();
}
