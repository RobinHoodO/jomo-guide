import { canSpendBandwidth } from './network';
import { enqueueOutbox, type OutboxKind, type OutboxPayload } from './outbox';
import { normalizeCreateInput, normalizeUpdateInput } from './mission-rules';
import { ensureSignedIn, getSupabase } from './supabase';

const MISSIONS_CACHE_KEY = 'jomo26:missions-cache';

export type CapacityType = 'open' | 'limited' | 'exclusive';
export type MissionVisibility = 'public' | 'hidden';
export type ClaimState = 'claimed' | 'done' | 'released' | 'submitted';

export type Profile = {
  id: string;
  display_name: string | null;
  created_at: string;
};

export type Mission = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  capacity_type: CapacityType;
  capacity: number | null;
  grid_ref: string | null;
  requires_presence: boolean;
  requires_verification: boolean;
  visibility: MissionVisibility;
  is_closed: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Claim = {
  id: string;
  mission_id: string;
  claimer_id: string;
  state: ClaimState;
  claimed_at: string;
  done_at: string | null;
  released_at: string | null;
};

export type MissionWithClaims = Mission & {
  claims: Claim[];
  activeClaimCount: number;
  spotsLeft: number | null;
  myClaim: Claim | null;
};

export type CreateMissionInput = {
  title: string;
  description?: string;
  capacity_type: CapacityType;
  capacity?: number | null;
  grid_ref?: string | null;
  requires_presence?: boolean;
  requires_verification?: boolean;
  visibility?: MissionVisibility;
  expires_at?: string | null;
};

export type UpdateMissionInput = Partial<
  Pick<
    Mission,
    | 'title'
    | 'description'
    | 'capacity_type'
    | 'capacity'
    | 'grid_ref'
    | 'requires_presence'
    | 'requires_verification'
    | 'visibility'
    | 'is_closed'
    | 'expires_at'
  >
>;

export type MissionResult<T> = {
  data: T | null;
  error: string | null;
  stale: boolean;
  queued: boolean;
};

export type MissionListResult = Omit<MissionResult<MissionWithClaims[]>, 'data'> & {
  data: MissionWithClaims[];
};

type MissionRowWithClaims = Mission & { mission_claims?: Claim[] | null };
export function claimRequiresConnection(capacityType: CapacityType) {
  return capacityType !== 'open';
}

function result<T>(data: T): MissionResult<T> {
  return { data, error: null, stale: false, queued: false };
}

function fail<T>(error: string, queued = false): MissionResult<T> {
  return { data: null, error, stale: false, queued };
}

function listResult(data: MissionWithClaims[], error: string | null, stale: boolean): MissionListResult {
  return { data, error, stale, queued: false };
}

function errorMessage(error: unknown, fallback = 'Missions are unavailable right now.') {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

function isConnectivityError(error: unknown) {
  if (!canSpendBandwidth()) return true;

  return /network|fetch|offline|timeout|abort/i.test(errorMessage(error, ''));
}

function readCachedRows(): MissionRowWithClaims[] | null {
  try {
    const value = localStorage.getItem(MISSIONS_CACHE_KEY);
    if (!value) return null;

    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as MissionRowWithClaims[]) : null;
  } catch {
    return null;
  }
}

function cacheRows(rows: MissionRowWithClaims[]) {
  try {
    localStorage.setItem(MISSIONS_CACHE_KEY, JSON.stringify(rows));
  } catch {
    // A cache is a convenience; private browsing must remain fully usable without it.
  }
}

async function currentUserId() {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getSession();
    return error ? null : (data.session?.user.id ?? null);
  } catch {
    return null;
  }
}

function withClaims(row: MissionRowWithClaims, userId: string | null): MissionWithClaims {
  const { mission_claims: missionClaims, ...mission } = row;
  const claims = Array.isArray(missionClaims) ? missionClaims : [];
  const activeClaims = claims.filter((claim) => claim.state !== 'released');
  const capacity = row.capacity_type === 'open' ? null : row.capacity;

  return {
    ...mission,
    claims,
    activeClaimCount: activeClaims.length,
    spotsLeft: capacity === null ? null : Math.max(0, capacity - activeClaims.length),
    myClaim: userId ? claims.find((claim) => claim.claimer_id === userId && claim.state !== 'released') ?? null : null
  };
}

function validId(id: string) {
  return id.trim().length > 0;
}

function queued<T>(kind: OutboxKind, payload: OutboxPayload): MissionResult<T> {
  if (!enqueueOutbox(kind, payload)) {
    return fail<T>('This change could not be saved locally. Please try again when connected.');
  }

  return { data: null, error: null, stale: false, queued: true };
}

export async function listMissions(): Promise<MissionListResult> {
  const cached = readCachedRows();

  if (!canSpendBandwidth()) {
    return listResult((cached ?? []).map((row) => withClaims(row, null)), null, true);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return listResult(
      (cached ?? []).map((row) => withClaims(row, null)),
      'Missions are unavailable right now.',
      true
    );
  }

  const userId = await currentUserId();

  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*, mission_claims(*)')
      .eq('visibility', 'public')
      .eq('is_closed', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as MissionRowWithClaims[];
    cacheRows(rows);
    return listResult(rows.map((row) => withClaims(row, userId)), null, false);
  } catch (error) {
    return listResult(
      (cached ?? []).map((row) => withClaims(row, userId)),
      cached ? 'Showing saved missions while the board reconnects.' : errorMessage(error),
      true
    );
  }
}

export async function createMission(input: CreateMissionInput): Promise<MissionResult<Mission>> {
  const normalized = normalizeCreateInput(input);
  if (normalized.error !== null) return fail<Mission>(normalized.error);

  const payload: OutboxPayload = { input: normalized.data };
  if (!canSpendBandwidth()) return queued<Mission>('create', payload);

  const userId = await ensureSignedIn();
  const supabase = getSupabase();
  if (!userId || !supabase) return queued<Mission>('create', payload);

  try {
    const { data, error } = await supabase
      .from('missions')
      .insert({ ...normalized.data, creator_id: userId, is_closed: false })
      .select()
      .single();

    if (error) throw error;
    return result(data as Mission);
  } catch (error) {
    return isConnectivityError(error) ? queued<Mission>('create', payload) : fail<Mission>(errorMessage(error));
  }
}

export async function updateMission(id: string, patch: UpdateMissionInput): Promise<MissionResult<Mission>> {
  if (!validId(id)) return fail<Mission>('A mission id is required.');

  const normalized = normalizeUpdateInput(patch);
  if (normalized.error !== null) return fail<Mission>(normalized.error);

  const payload: OutboxPayload = { id, patch: normalized.data };
  if (!canSpendBandwidth()) return queued<Mission>('update', payload);

  const userId = await ensureSignedIn();
  const supabase = getSupabase();
  if (!userId || !supabase) return queued<Mission>('update', payload);

  try {
    const { data, error } = await supabase.from('missions').update(normalized.data).eq('id', id).select().single();
    if (error) throw error;
    return result(data as Mission);
  } catch (error) {
    return isConnectivityError(error) ? queued<Mission>('update', payload) : fail<Mission>(errorMessage(error));
  }
}

export async function deleteMission(id: string): Promise<MissionResult<string>> {
  if (!validId(id)) return fail<string>('A mission id is required.');

  const payload: OutboxPayload = { id };
  if (!canSpendBandwidth()) return queued<string>('delete', payload);

  const userId = await ensureSignedIn();
  const supabase = getSupabase();
  if (!userId || !supabase) return queued<string>('delete', payload);

  try {
    const { error } = await supabase.from('missions').delete().eq('id', id);
    if (error) throw error;
    return result(id);
  } catch (error) {
    return isConnectivityError(error) ? queued<string>('delete', payload) : fail<string>(errorMessage(error));
  }
}

function claimErrorMessage(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  if (message.includes('mission is already full')) return 'Someone got there first — this mission is already full.';
  if (message.includes('mission is closed')) return 'This mission is closed.';
  if (message.includes('mission has expired')) return 'This mission has expired.';
  return errorMessage(error);
}

export async function claimMission(id: string, capacityType: CapacityType): Promise<MissionResult<Claim>> {
  if (!validId(id)) return fail<Claim>('A mission id is required.');

  const payload: OutboxPayload = { missionId: id };
  if (!canSpendBandwidth()) {
    if (capacityType === 'open') return queued<Claim>('claim', payload);
    return fail<Claim>('Claiming requires a live connection.');
  }

  const userId = await ensureSignedIn();
  const supabase = getSupabase();
  if (!userId || !supabase) return fail<Claim>('Claiming requires a live connection.');

  try {
    const { data, error } = await supabase.rpc('claim_mission', { p_mission_id: id });
    if (error) throw error;
    return result(data as Claim);
  } catch (error) {
    if (capacityType === 'open' && isConnectivityError(error)) return queued<Claim>('claim', payload);
    return fail<Claim>(claimErrorMessage(error));
  }
}

async function changeClaimState(
  claimId: string,
  kind: 'done' | 'release' | 'submit' | 'approve' | 'reject'
): Promise<MissionResult<Claim>> {
  if (!validId(claimId)) return fail<Claim>('A claim id is required.');

  const timestamp = new Date().toISOString();
  const payload: OutboxPayload =
    kind === 'done' || kind === 'approve'
      ? { claimId, doneAt: timestamp }
      : kind === 'release'
        ? { claimId, releasedAt: timestamp }
        : { claimId };

  if (!canSpendBandwidth()) return queued<Claim>(kind, payload);

  const userId = await ensureSignedIn();
  const supabase = getSupabase();
  if (!userId || !supabase) return queued<Claim>(kind, payload);

  const update =
    kind === 'done' || kind === 'approve'
      ? { state: 'done', done_at: timestamp }
      : kind === 'release'
        ? { state: 'released', released_at: timestamp }
        : kind === 'submit'
          ? { state: 'submitted', done_at: null }
          : { state: 'claimed', done_at: null };

  try {
    const { data, error } = await supabase.from('mission_claims').update(update).eq('id', claimId).select().single();
    if (error) throw error;
    return result(data as Claim);
  } catch (error) {
    return isConnectivityError(error) ? queued<Claim>(kind, payload) : fail<Claim>(errorMessage(error));
  }
}

export function markClaimDone(claimId: string) {
  return changeClaimState(claimId, 'done');
}

export function releaseClaim(claimId: string) {
  return changeClaimState(claimId, 'release');
}

export function submitClaim(claimId: string) {
  return changeClaimState(claimId, 'submit');
}

export function approveClaim(claimId: string) {
  return changeClaimState(claimId, 'approve');
}

export function rejectClaim(claimId: string) {
  return changeClaimState(claimId, 'reject');
}
