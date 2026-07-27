import { canonicalCell } from './geo';
import { getCurrentCell, subscribeCurrentCell } from './whereami';

// Hashing raises the effort from "read the source" to "write a script" — the grid is only 676
// cells, so a determined person can still brute-force it in milliseconds. This deters the casual
// spoiler; it does not make the secret cryptographically safe.
const SECRET_CELL_HASH = import.meta.env.VITE_SECRET_CELL_HASH;
const PRESENCE_CELL_HASH = import.meta.env.VITE_PRESENCE_CELL_HASH;

const secretCellMatches = new Map<string, Promise<boolean>>();
const presenceCellMatches = new Map<string, Promise<boolean>>();

export const PRESENCE_PLACE_NAME = 'The Understory';

type UnlockSnapshot = {
  unlocked: boolean;
  unlockedAt: string;
};

type PresenceListener = (isPresent: boolean) => void;

const STORAGE_KEY = 'jomo26:deep';
const PRESENCE_DEBOUNCE_MS = 10_000;
const LOCKED_SNAPSHOT: UnlockSnapshot = { unlocked: false, unlockedAt: '' };

const unlockListeners = new Set<() => void>();
const presenceListeners = new Set<PresenceListener>();

let unlockSnapshot = readUnlockSnapshot();
let isPresent = false;
let presenceCandidate = false;
let presenceTimer: number | null = null;
let presenceCheckGeneration = 0;

function constantTimeEquals(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}

async function hashMatchesCell(code: string, expectedHash: string | undefined): Promise<boolean> {
  try {
    if (!expectedHash || typeof crypto === 'undefined' || !crypto.subtle) return false;

    const normalizedCode = canonicalCell(code);
    if (!normalizedCode) return false;

    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizedCode));
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');

    return constantTimeEquals(hash, expectedHash);
  } catch {
    return false;
  }
}

function memoizedCellMatch(
  code: string,
  expectedHash: string | undefined,
  cache: Map<string, Promise<boolean>>
): Promise<boolean> {
  try {
    const normalizedCode = canonicalCell(code);
    if (!normalizedCode) return Promise.resolve(false);

    const cached = cache.get(normalizedCode);
    if (cached) return cached;

    const match = hashMatchesCell(normalizedCode, expectedHash);
    cache.set(normalizedCode, match);
    return match;
  } catch {
    return Promise.resolve(false);
  }
}

export async function matchesSecretCell(code: string): Promise<boolean> {
  try {
    return await memoizedCellMatch(code, SECRET_CELL_HASH, secretCellMatches);
  } catch {
    return false;
  }
}

export async function matchesPresenceCell(code: string): Promise<boolean> {
  try {
    return await memoizedCellMatch(code, PRESENCE_CELL_HASH, presenceCellMatches);
  } catch {
    return false;
  }
}

function readUnlockSnapshot(): UnlockSnapshot {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return LOCKED_SNAPSHOT;

    const parsed = JSON.parse(stored) as Partial<UnlockSnapshot>;
    if (parsed.unlocked === true && typeof parsed.unlockedAt === 'string' && parsed.unlockedAt) {
      return { unlocked: true, unlockedAt: parsed.unlockedAt };
    }
  } catch {
    // Safari private browsing can reject localStorage reads.
  }

  return LOCKED_SNAPSHOT;
}

function clearPresenceTimer() {
  if (presenceTimer === null) return;
  window.clearTimeout(presenceTimer);
  presenceTimer = null;
}

function setPresence(nextPresence: boolean) {
  if (isPresent === nextPresence) return;
  isPresent = nextPresence;
  presenceListeners.forEach((listener) => listener(isPresent));
}

function queuePresence(nextPresence: boolean) {
  if (nextPresence === isPresent) {
    presenceCandidate = nextPresence;
    clearPresenceTimer();
    return;
  }

  if (presenceCandidate === nextPresence && presenceTimer !== null) return;

  presenceCandidate = nextPresence;
  clearPresenceTimer();
  presenceTimer = window.setTimeout(() => {
    presenceTimer = null;
    setPresence(presenceCandidate);
  }, PRESENCE_DEBOUNCE_MS);
}

function checkPresence(cell: string | null) {
  const checkGeneration = ++presenceCheckGeneration;
  void matchesPresenceCell(cell ?? '').then((matchesPresence) => {
    if (checkGeneration !== presenceCheckGeneration || presenceListeners.size === 0) return;
    queuePresence(matchesPresence);
  });
}

function stopPresenceCheck() {
  presenceCheckGeneration += 1;
  clearPresenceTimer();
  presenceCandidate = false;
  setPresence(false);
}

export function isUnlocked() {
  return unlockSnapshot.unlocked;
}

export function unlock() {
  if (unlockSnapshot.unlocked) return;

  unlockSnapshot = { unlocked: true, unlockedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockSnapshot));
  } catch {
    // Keep the unlocked session usable when storage is unavailable.
  }
  unlockListeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  unlockListeners.add(listener);
  return () => {
    unlockListeners.delete(listener);
  };
}

export function getSnapshot() {
  return unlockSnapshot;
}

export function subscribePresence(listener: PresenceListener) {
  presenceListeners.add(listener);
  listener(isPresent);
  const checkCurrentCell = () => checkPresence(getCurrentCell());
  const unsubscribeCurrentCell = subscribeCurrentCell(checkCurrentCell);
  checkCurrentCell();

  return () => {
    presenceListeners.delete(listener);
    unsubscribeCurrentCell();
    if (presenceListeners.size === 0) stopPresenceCheck();
  };
}
