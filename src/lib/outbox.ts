import { canSpendBandwidth } from './network';
import { ensureSignedIn, getSupabase } from './supabase';
import type { CreateMissionInput, UpdateMissionInput } from './missions';

const OUTBOX_KEY = 'jomo26:outbox';
const MAX_TRIES = 5;

export type OutboxKind = 'create' | 'update' | 'delete' | 'claim' | 'done' | 'release' | 'submit' | 'approve' | 'reject';

export type OutboxPayload =
  | { input: CreateMissionInput; missionId?: string }
  | { id: string; patch: UpdateMissionInput }
  | { id: string }
  | { missionId: string }
  | { claimId: string; doneAt: string }
  | { claimId: string; releasedAt: string }
  | { claimId: string };

export type OutboxEntry = {
  id: string;
  kind: OutboxKind;
  payload: OutboxPayload;
  createdAt: string;
  tries: number;
};

export type OutboxSnapshot = { pendingCount: number };
export type FlushOutboxResult = {
  flushed: number;
  dropped: number;
  pending: number;
  error: string | null;
};

const listeners = new Set<() => void>();
let snapshot: OutboxSnapshot = { pendingCount: 0 };
let flushInFlight: Promise<FlushOutboxResult> | undefined;

function isOutboxKind(value: unknown): value is OutboxKind {
  return (
    value === 'create' ||
    value === 'update' ||
    value === 'delete' ||
    value === 'claim' ||
    value === 'done' ||
    value === 'release' ||
    value === 'submit' ||
    value === 'approve' ||
    value === 'reject'
  );
}

function readOutbox(): OutboxEntry[] {
  try {
    const value = localStorage.getItem(OUTBOX_KEY);
    if (!value) return [];

    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (entry): entry is OutboxEntry =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof entry.id === 'string' &&
        isOutboxKind(entry.kind) &&
        typeof entry.createdAt === 'string' &&
        typeof entry.tries === 'number' &&
        'payload' in entry
    );
  } catch {
    return [];
  }
}

function updateSnapshot(pendingCount: number) {
  if (snapshot.pendingCount === pendingCount) return;

  snapshot = { pendingCount };
  listeners.forEach((listener) => listener());
}

function saveOutbox(entries: OutboxEntry[]) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
    updateSnapshot(entries.length);
    return true;
  } catch {
    return false;
  }
}

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `outbox-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function errorMessage(error: unknown, fallback = 'Unable to sync this change.') {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

function hasRewardFields(input: UpdateMissionInput) {
  return 'reward_kind' in input || 'reward_threshold' in input || 'reward_body' in input || 'reward_closer_body' in input;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  const pendingCount = readOutbox().length;
  if (snapshot.pendingCount !== pendingCount) snapshot = { pendingCount };
  return snapshot;
}

/** Adds non-contended work. Open-mission claims are safe to replay; limited and exclusive claims are not queued. */
export function enqueueOutbox(kind: OutboxKind, payload: OutboxPayload) {
  const entries = readOutbox();
  entries.push({ id: makeId(), kind, payload, createdAt: new Date().toISOString(), tries: 0 });
  return saveOutbox(entries);
}

async function syncEntry(entry: OutboxEntry): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return 'Missions are unavailable right now.';

  const userId = await ensureSignedIn();
  if (!userId) return 'Unable to sign in for mission sync.';

  try {
    switch (entry.kind) {
      case 'create': {
        const payload = entry.payload as Extract<OutboxPayload, { input: CreateMissionInput }>;
        const { input } = payload;
        const { reward_body, reward_closer_body, ...mission } = input;
        let missionId = payload.missionId;

        if (!missionId) {
          const { data, error } = await supabase
            .from('missions')
            .insert({ ...mission, creator_id: userId, is_closed: false })
            .select('id')
            .single();
          if (error) return error.message;

          missionId = data.id as string;
          entry.payload = { input, missionId };
        }

        if (!mission.reward_kind) return null;

        const { error } = await supabase.from('mission_rewards').upsert(
          {
            mission_id: missionId,
            body: reward_body ?? '',
            closer_body: reward_closer_body ?? null
          },
          { onConflict: 'mission_id' }
        );
        return error ? error.message : null;
      }
      case 'update': {
        const { id, patch } = entry.payload as Extract<OutboxPayload, { patch: UpdateMissionInput }>;
        const { reward_body, reward_closer_body, ...mission } = patch;
        const { error } = await supabase.from('missions').update(mission).eq('id', id);
        if (error) return error.message;
        if (!hasRewardFields(patch)) return null;

        if (!patch.reward_kind) {
          const { error } = await supabase.from('mission_rewards').delete().eq('mission_id', id);
          return error ? error.message : null;
        }

        const { error: rewardError } = await supabase.from('mission_rewards').upsert(
          {
            mission_id: id,
            body: reward_body ?? '',
            closer_body: reward_closer_body ?? null
          },
          { onConflict: 'mission_id' }
        );
        return rewardError ? rewardError.message : null;
      }
      case 'delete': {
        const { id } = entry.payload as Extract<OutboxPayload, { id: string }>;
        const { error } = await supabase.from('missions').delete().eq('id', id);
        return error ? error.message : null;
      }
      case 'claim': {
        const { missionId } = entry.payload as Extract<OutboxPayload, { missionId: string }>;
        const { error } = await supabase.rpc('claim_mission', { p_mission_id: missionId });
        return error ? error.message : null;
      }
      case 'done': {
        const { claimId, doneAt } = entry.payload as Extract<OutboxPayload, { doneAt: string }>;
        const { error } = await supabase
          .from('mission_claims')
          .update({ state: 'done', done_at: doneAt })
          .eq('id', claimId);
        return error ? error.message : null;
      }
      case 'release': {
        const { claimId, releasedAt } = entry.payload as Extract<OutboxPayload, { releasedAt: string }>;
        const { error } = await supabase
          .from('mission_claims')
          .update({ state: 'released', released_at: releasedAt })
          .eq('id', claimId);
        return error ? error.message : null;
      }
      case 'submit': {
        const { claimId } = entry.payload as Extract<OutboxPayload, { claimId: string }>;
        const { error } = await supabase
          .from('mission_claims')
          .update({ state: 'submitted', done_at: null })
          .eq('id', claimId);
        return error ? error.message : null;
      }
      case 'approve': {
        const { claimId, doneAt } = entry.payload as Extract<OutboxPayload, { doneAt: string }>;
        const { error } = await supabase
          .from('mission_claims')
          .update({ state: 'done', done_at: doneAt })
          .eq('id', claimId);
        return error ? error.message : null;
      }
      case 'reject': {
        const { claimId } = entry.payload as Extract<OutboxPayload, { claimId: string }>;
        const { error } = await supabase
          .from('mission_claims')
          .update({ state: 'claimed', done_at: null })
          .eq('id', claimId);
        return error ? error.message : null;
      }
    }
  } catch (error) {
    return errorMessage(error);
  }
}

async function flush(): Promise<FlushOutboxResult> {
  let entries = readOutbox().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let flushed = 0;
  let dropped = 0;

  for (const entry of entries) {
    if (!canSpendBandwidth()) break;

    const error = await syncEntry(entry);
    if (!error) {
      entries = entries.filter((candidate) => candidate.id !== entry.id);
      saveOutbox(entries);
      flushed += 1;
      continue;
    }

    const tries = entry.tries + 1;
    if (tries >= MAX_TRIES) {
      entries = entries.filter((candidate) => candidate.id !== entry.id);
      saveOutbox(entries);
      dropped += 1;
      continue;
    }

    entries = entries.map((candidate) => (candidate.id === entry.id ? { ...candidate, tries } : candidate));
    saveOutbox(entries);
    return { flushed, dropped, pending: entries.length, error };
  }

  return { flushed, dropped, pending: entries.length, error: null };
}

/**
 * Replays queued, non-contended writes in order. This function is never called
 * automatically; the UI can call it after a deliberate reconnect opportunity.
 */
export function flushOutbox(): Promise<FlushOutboxResult> {
  if (flushInFlight) return flushInFlight;

  if (!canSpendBandwidth()) {
    const pending = readOutbox().length;
    updateSnapshot(pending);
    return Promise.resolve({ flushed: 0, dropped: 0, pending, error: null });
  }

  flushInFlight = flush().finally(() => {
    flushInFlight = undefined;
  });

  return flushInFlight;
}
