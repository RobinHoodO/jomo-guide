import { track } from '@vercel/analytics';
import { canSpendBandwidth } from './network';

type UsageEntry = {
  opens: number;
  offline: number;
  sent: boolean;
};

type Usage = Record<string, UsageEntry>;

const STORAGE_KEY = 'jomo26:usage';
const MAX_AGE_DAYS = 30;
let isFlushing = false;

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function pruneUsage(usage: Usage, today: string) {
  const cutoff = new Date(`${today}T00:00:00`);
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
  const cutoffKey = dateKey(cutoff);

  return Object.fromEntries(
    Object.entries(usage).filter(([day]) => day >= cutoffKey)
  );
}

function readUsage(today = dateKey()): Usage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const usage: Usage = {};
    for (const [day, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;

      const entry = value as Partial<UsageEntry>;
      usage[day] = {
        opens: typeof entry.opens === 'number' ? entry.opens : 0,
        offline: typeof entry.offline === 'number' ? entry.offline : 0,
        sent: entry.sent === true
      };
    }

    return pruneUsage(usage, today);
  } catch {
    return {};
  }
}

function saveUsage(usage: Usage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // Safari private browsing can reject localStorage writes.
  }
}

export function recordOpen() {
  const today = dateKey();
  const usage = readUsage(today);
  const entry = usage[today] ?? { opens: 0, offline: 0, sent: false };

  entry.opens += 1;
  if (!navigator.onLine) entry.offline += 1;

  usage[today] = entry;
  saveUsage(usage);
}

export function flushUsage() {
  if (!canSpendBandwidth() || isFlushing) return;

  isFlushing = true;
  try {
    const today = dateKey();
    const usage = readUsage(today);
    const unsentEntries = Object.entries(usage).filter(([day, entry]) => day !== today && !entry.sent);
    if (unsentEntries.length === 0) return;

    const days = unsentEntries
      .map(([day, entry]) => `${day}:${entry.opens}:${entry.offline}`)
      .join(',');

    try {
      track('usage-batch', { days });

      for (const [, entry] of unsentEntries) {
        entry.sent = true;
      }
      saveUsage(usage);
    } catch {
      // Keep the entries unsent so a later connection can retry the batch.
    }
  } finally {
    isFlushing = false;
  }
}
