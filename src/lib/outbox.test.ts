import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// outbox.ts talks to localStorage directly (no DOM env in this project's test
// setup) and to Supabase for the online sync path — a tiny in-memory stub and
// module mocks keep these tests fast and dependency-free.
function makeMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    }
  };
}

const { canSpendBandwidth } = vi.hoisted(() => ({ canSpendBandwidth: vi.fn(() => true) }));
vi.mock('./network', () => ({ canSpendBandwidth }));

const { getSupabase, ensureSignedIn } = vi.hoisted(() => ({
  getSupabase: vi.fn(() => null as unknown),
  ensureSignedIn: vi.fn(async () => 'user-1' as string | null)
}));
vi.mock('./supabase', () => ({ getSupabase, ensureSignedIn }));

import { enqueueOutbox, flushOutbox, getSnapshot, subscribe } from './outbox';

beforeEach(() => {
  vi.stubGlobal('localStorage', makeMemoryStorage());
  canSpendBandwidth.mockReturnValue(true);
  getSupabase.mockReturnValue(null);
  ensureSignedIn.mockResolvedValue('user-1');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('enqueueOutbox / getSnapshot', () => {
  it('starts empty', () => {
    expect(getSnapshot().pendingCount).toBe(0);
  });

  it('enqueuing raises the pending count', () => {
    expect(enqueueOutbox('claim', { missionId: 'm1' })).toBe(true);
    expect(getSnapshot().pendingCount).toBe(1);

    enqueueOutbox('claim', { missionId: 'm2' });
    expect(getSnapshot().pendingCount).toBe(2);
  });

  it('notifies subscribers when the pending count changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    enqueueOutbox('claim', { missionId: 'm1' });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    enqueueOutbox('claim', { missionId: 'm2' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('flushOutbox — offline', () => {
  it('reports pending work without touching Supabase', async () => {
    canSpendBandwidth.mockReturnValue(false);
    enqueueOutbox('claim', { missionId: 'm1' });

    const flushResult = await flushOutbox();
    expect(flushResult).toEqual({ flushed: 0, dropped: 0, pending: 1, error: null });
    expect(getSupabase).not.toHaveBeenCalled();
    expect(getSnapshot().pendingCount).toBe(1);
  });
});

describe('flushOutbox — sync failure and retry', () => {
  it('increments tries and keeps the entry queued when Supabase is unavailable', async () => {
    getSupabase.mockReturnValue(null);
    enqueueOutbox('claim', { missionId: 'm1' });

    const result = await flushOutbox();
    expect(result.flushed).toBe(0);
    expect(result.dropped).toBe(0);
    expect(result.pending).toBe(1);
    expect(result.error).toBe('Missions are unavailable right now.');
  });

  it('drops an entry after MAX_TRIES (5) consecutive failures instead of retrying forever', async () => {
    getSupabase.mockReturnValue(null);
    enqueueOutbox('claim', { missionId: 'm1' });

    // 5 total attempts: tries goes 0->1->2->3->4->5, dropped on the 5th.
    for (let i = 0; i < 4; i++) {
      const attempt = await flushOutbox();
      expect(attempt.dropped).toBe(0);
      expect(attempt.pending).toBe(1);
    }

    const final = await flushOutbox();
    expect(final.dropped).toBe(1);
    expect(final.pending).toBe(0);
    expect(getSnapshot().pendingCount).toBe(0);
  });
});
