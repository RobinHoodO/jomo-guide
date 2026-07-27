import { canonicalCell } from './geo';
import { getCurrentCell, subscribeCurrentCell } from './whereami';

export type GridExperienceId = 'quant-terminal';

const EXPERIENCES: Array<{ id: GridExperienceId; cellHash: string | undefined }> = [
  // ponytail: M10 test grid = the presence cell for now; give it VITE_QUANT_CELL_HASH when it moves
  { id: 'quant-terminal', cellHash: import.meta.env.VITE_QUANT_CELL_HASH ?? import.meta.env.VITE_PRESENCE_CELL_HASH }
];

const EXIT_DEBOUNCE_MS = 10_000;
const experienceListeners = new Set<(id: GridExperienceId | null) => void>();
const dismissedExperiences = new Set<GridExperienceId>();
const cellMatches = new Map<string, Promise<boolean>>();

let experienceSnapshot: GridExperienceId | null = null;
let experienceCandidate: GridExperienceId | null = null;
let exitTimer: number | null = null;
let checkGeneration = 0;

function constantTimeEquals(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}

// This mirrors hidden.ts rather than exporting its private helpers: both features keep their cell hashes private.
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

function memoizedCellMatch(code: string, expectedHash: string | undefined): Promise<boolean> {
  try {
    const normalizedCode = canonicalCell(code);
    if (!normalizedCode) return Promise.resolve(false);

    const key = `${expectedHash ?? ''}:${normalizedCode}`;
    const cached = cellMatches.get(key);
    if (cached) return cached;

    const match = hashMatchesCell(normalizedCode, expectedHash);
    cellMatches.set(key, match);
    return match;
  } catch {
    return Promise.resolve(false);
  }
}

async function experienceForCell(cell: string | null): Promise<GridExperienceId | null> {
  if (!cell) return null;

  for (const experience of EXPERIENCES) {
    if (dismissedExperiences.has(experience.id)) continue;
    if (await memoizedCellMatch(cell, experience.cellHash)) return experience.id;
  }

  return null;
}

function clearExitTimer() {
  if (exitTimer === null) return;
  window.clearTimeout(exitTimer);
  exitTimer = null;
}

function setGridExperience(nextExperience: GridExperienceId | null) {
  if (experienceSnapshot === nextExperience) return;
  experienceSnapshot = nextExperience;
  experienceListeners.forEach((listener) => listener(experienceSnapshot));
}

function queueGridExperience(nextExperience: GridExperienceId | null) {
  if (nextExperience !== null) {
    experienceCandidate = nextExperience;
    clearExitTimer();
    setGridExperience(nextExperience);
    return;
  }

  if (experienceSnapshot === null) {
    experienceCandidate = null;
    clearExitTimer();
    return;
  }

  if (experienceCandidate === null && exitTimer !== null) return;

  experienceCandidate = null;
  clearExitTimer();
  exitTimer = window.setTimeout(() => {
    exitTimer = null;
    setGridExperience(experienceCandidate);
  }, EXIT_DEBOUNCE_MS);
}

function checkCurrentCell(cell: string | null) {
  const generation = ++checkGeneration;
  void experienceForCell(cell).then((experience) => {
    if (generation !== checkGeneration || experienceListeners.size === 0) return;
    queueGridExperience(experience);
  });
}

function stopGridExperienceCheck() {
  checkGeneration += 1;
  experienceCandidate = null;
  clearExitTimer();
  setGridExperience(null);
}

export function subscribeGridExperience(listener: (id: GridExperienceId | null) => void) {
  experienceListeners.add(listener);
  const check = () => checkCurrentCell(getCurrentCell());
  const unsubscribeCurrentCell = subscribeCurrentCell(check);
  check();

  return () => {
    experienceListeners.delete(listener);
    unsubscribeCurrentCell();
    if (experienceListeners.size === 0) stopGridExperienceCheck();
  };
}

export function getGridExperienceSnapshot() {
  return experienceSnapshot;
}

// A question inside an experience can gate its depth; geography itself is intentionally not gated on isUnlocked().
export function dismissGridExperience(id: GridExperienceId) {
  dismissedExperiences.add(id);
  if (experienceSnapshot === id) {
    experienceCandidate = null;
    clearExitTimer();
    setGridExperience(null);
  }
}
