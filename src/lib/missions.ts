import { canSpendBandwidth } from './network';
import { enqueueOutbox, type OutboxKind, type OutboxPayload } from './outbox';
import { normalizeCreateInput, normalizeUpdateInput } from './mission-rules';
import { ensureSignedIn, getSupabase } from './supabase';

const MISSIONS_CACHE_KEY = 'jomo26:missions-cache';
const MISSION_NAMES_CACHE_KEY = 'jomo26:mission-names';

export type CapacityType = 'open' | 'limited' | 'exclusive';
export type MissionVisibility = 'public' | 'hidden';
export type ClaimState = 'claimed' | 'done' | 'released' | 'submitted';
export type RewardKind = 'content' | 'clue' | 'roster' | 'handover';
export type QuestReveal = 'hint' | 'length';
export type VerificationMode = 'none' | 'note' | 'prompt' | 'answer';

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
  verification_mode: VerificationMode;
  submission_prompt: string | null;
  visibility: MissionVisibility;
  is_closed: boolean;
  expires_at: string | null;
  reward_kind: RewardKind | null;
  reward_threshold: number | null;
  quest_id: string | null;
  quest_step: number | null;
  quest_reveal: QuestReveal | null;
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
  submission_note: string | null;
  submitted_at: string | null;
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
  verification_mode?: VerificationMode;
  submission_prompt?: string | null;
  expected_answer?: string | null;
  visibility?: MissionVisibility;
  expires_at?: string | null;
  reward_kind?: RewardKind | null;
  reward_threshold?: number | null;
  reward_body?: string | null;
  reward_closer_body?: string | null;
  quest_id?: string | null;
  quest_step?: number | null;
  quest_reveal?: QuestReveal | null;
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
    | 'verification_mode'
    | 'submission_prompt'
    | 'visibility'
    | 'is_closed'
    | 'expires_at'
    | 'reward_kind'
    | 'reward_threshold'
    | 'quest_id'
    | 'quest_step'
    | 'quest_reveal'
  >
> & {
  reward_body?: string | null;
  reward_closer_body?: string | null;
  expected_answer?: string | null;
};

export type MissionResult<T> = {
  data: T | null;
  error: string | null;
  stale: boolean;
  queued: boolean;
};

export type MissionListResult = Omit<MissionResult<MissionWithClaims[]>, 'data'> & {
  data: MissionWithClaims[];
  names: Record<string, string>;
};

export type MissionReward = {
  has_reward: boolean;
  kind: RewardKind | null;
  threshold: number | null;
  done_count: number;
  unlocked: boolean;
  you_did_it: boolean;
  you_closed_it: boolean;
  roster: string[];
  body: string | null;
  closer_body: string | null;
};

export type MissionRewardPayload = {
  body: string;
  closer_body: string | null;
};

export type MissionExpectedAnswer = {
  answer_norm: string;
};

export type SubmitClaimResult = {
  accepted: boolean;
  auto_approved: boolean;
  claim: Claim | null;
};

export type QuestShape = {
  steps: number | null;
  reveal: QuestReveal | null;
  has_more: boolean;
  your_progress: number | null;
};

type ProfileEmbed = { display_name?: string | null };
type ClaimRowWithClaimer = Claim & { claimer?: ProfileEmbed | null };
type MissionRowWithClaims = Mission & {
  creator?: ProfileEmbed | null;
  mission_claims?: ClaimRowWithClaimer[] | null;
};
type CachedMissionRow = Mission & { mission_claims?: Claim[] | null };
type CachedMissionBoard = { rows: CachedMissionRow[]; names: Record<string, string> };
type RewardSaveInput = Pick<CreateMissionInput, 'reward_kind' | 'reward_body' | 'reward_closer_body'>;
type SupabaseClient = NonNullable<ReturnType<typeof getSupabase>>;

export function claimRequiresConnection(capacityType: CapacityType) {
  return capacityType !== 'open';
}

function result<T>(data: T): MissionResult<T> {
  return { data, error: null, stale: false, queued: false };
}

function fail<T>(error: string, queued = false): MissionResult<T> {
  return { data: null, error, stale: false, queued };
}

function listResult(
  data: MissionWithClaims[],
  error: string | null,
  stale: boolean,
  names: Record<string, string>
): MissionListResult {
  return { data, error, stale, queued: false, names };
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

function readCachedNames(): Record<string, string> {
  try {
    const value = localStorage.getItem(MISSION_NAMES_CACHE_KEY);
    if (!value) return {};

    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(([id, name]) => typeof id === 'string' && typeof name === 'string' && name.trim())
    );
  } catch {
    return {};
  }
}

function embeddedName(profile: ProfileEmbed | null | undefined) {
  const name = profile?.display_name?.trim();
  return name || null;
}

function normaliseRows(rows: MissionRowWithClaims[]): CachedMissionBoard {
  const names: Record<string, string> = {};
  const normalizedRows = rows.map((row) => {
    const { creator, mission_claims: missionClaims, ...mission } = row;
    const creatorName = embeddedName(creator);
    if (creatorName) names[mission.creator_id] = creatorName;

    const claims = Array.isArray(missionClaims)
      ? missionClaims.map((claim) => {
          const { claimer, ...normalizedClaim } = claim;
          const claimerName = embeddedName(claimer);
          if (claimerName) names[normalizedClaim.claimer_id] = claimerName;
          return normalizedClaim;
        })
      : missionClaims;

    return { ...mission, mission_claims: claims };
  });

  return { rows: normalizedRows, names };
}

function readCachedRows(): CachedMissionBoard | null {
  try {
    const value = localStorage.getItem(MISSIONS_CACHE_KEY);
    if (!value) return null;

    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;

    const normalized = normaliseRows(parsed as MissionRowWithClaims[]);
    return { rows: normalized.rows, names: { ...readCachedNames(), ...normalized.names } };
  } catch {
    return null;
  }
}

function cacheRows(rows: CachedMissionRow[], names: Record<string, string>) {
  try {
    localStorage.setItem(MISSIONS_CACHE_KEY, JSON.stringify(rows));
    localStorage.setItem(MISSION_NAMES_CACHE_KEY, JSON.stringify(names));
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

function withClaims(row: CachedMissionRow, userId: string | null): MissionWithClaims {
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

function hasRewardFields(input: UpdateMissionInput) {
  return 'reward_kind' in input || 'reward_threshold' in input || 'reward_body' in input || 'reward_closer_body' in input;
}

function hasAnswerFields(input: UpdateMissionInput) {
  return 'verification_mode' in input || 'expected_answer' in input;
}

async function saveMissionReward(supabase: SupabaseClient, missionId: string, reward: RewardSaveInput) {
  if (!reward.reward_kind) {
    const { error } = await supabase.from('mission_rewards').delete().eq('mission_id', missionId);
    return error?.message ?? null;
  }

  const { error } = await supabase.from('mission_rewards').upsert(
    {
      mission_id: missionId,
      body: reward.reward_body ?? '',
      closer_body: reward.reward_closer_body ?? null
    },
    { onConflict: 'mission_id' }
  );
  return error?.message ?? null;
}

async function saveMissionAnswer(
  supabase: SupabaseClient,
  missionId: string,
  verificationMode: VerificationMode | undefined,
  expectedAnswer: string | null | undefined
) {
  if (verificationMode === 'answer' || expectedAnswer) {
    const { error } = await supabase.from('mission_answers').upsert(
      { mission_id: missionId, answer_norm: expectedAnswer ?? '' },
      { onConflict: 'mission_id' }
    );
    return error?.message ?? null;
  }

  if (verificationMode !== undefined || expectedAnswer === null) {
    const { error } = await supabase.from('mission_answers').delete().eq('mission_id', missionId);
    return error?.message ?? null;
  }

  return null;
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
    return listResult((cached?.rows ?? []).map((row) => withClaims(row, null)), null, true, cached?.names ?? {});
  }

  const supabase = getSupabase();
  if (!supabase) {
    return listResult(
      (cached?.rows ?? []).map((row) => withClaims(row, null)),
      'Missions are unavailable right now.',
      true,
      cached?.names ?? {}
    );
  }

  const userId = await currentUserId();

  try {
    const { data, error } = await supabase
      .from('missions')
      .select(
        'id,creator_id,title,description,capacity_type,capacity,grid_ref,requires_presence,verification_mode,submission_prompt,visibility,is_closed,expires_at,reward_kind,reward_threshold,quest_id,quest_step,quest_reveal,created_at,updated_at,creator:profiles!missions_creator_id_fkey(display_name),mission_claims(id,mission_id,claimer_id,state,claimed_at,done_at,released_at,submission_note,submitted_at,claimer:profiles!mission_claims_claimer_id_fkey(display_name))'
      )
      .eq('visibility', 'public')
      .eq('is_closed', false)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const normalized = normaliseRows((data ?? []) as MissionRowWithClaims[]);
    cacheRows(normalized.rows, normalized.names);
    return listResult(normalized.rows.map((row) => withClaims(row, userId)), null, false, normalized.names);
  } catch (error) {
    return listResult(
      (cached?.rows ?? []).map((row) => withClaims(row, userId)),
      cached ? 'Showing saved missions while the board reconnects.' : errorMessage(error),
      true,
      cached?.names ?? {}
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

  const { reward_body, reward_closer_body, expected_answer, ...mission } = normalized.data;
  let data: Mission;
  try {
    const { data: missionData, error } = await supabase
      .from('missions')
      .insert({ ...mission, creator_id: userId, is_closed: false })
      .select()
      .single();

    if (error) throw error;
    data = missionData as Mission;
  } catch (error) {
    return isConnectivityError(error) ? queued<Mission>('create', payload) : fail<Mission>(errorMessage(error));
  }

  if (mission.verification_mode === 'answer') {
    let answerError: string | null;
    try {
      answerError = await saveMissionAnswer(supabase, data.id, mission.verification_mode, expected_answer);
    } catch {
      answerError = 'The expected answer could not be saved.';
    }
    if (answerError) {
      return {
        data,
        error: 'Your mission was created, but its expected answer did not save. Edit it to try again.',
        stale: false,
        queued: false
      };
    }
  }

  if (mission.reward_kind) {
    let rewardError: string | null;
    try {
      rewardError = await saveMissionReward(supabase, data.id, {
        reward_kind: mission.reward_kind,
        reward_body,
        reward_closer_body
      });
    } catch {
      rewardError = 'The reward payload could not be saved.';
    }
    if (rewardError) {
      return {
        data,
        error: 'Your mission was created, but its promise did not save. Edit it to try again.',
        stale: false,
        queued: false
      };
    }
  }

  return result(data);
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

  const { reward_body, reward_closer_body, expected_answer, ...mission } = normalized.data;
  let data: Mission;
  try {
    const { data: missionData, error } = await supabase.from('missions').update(mission).eq('id', id).select().single();
    if (error) throw error;
    data = missionData as Mission;
  } catch (error) {
    return isConnectivityError(error) ? queued<Mission>('update', payload) : fail<Mission>(errorMessage(error));
  }

  if (hasAnswerFields(normalized.data)) {
    let answerError: string | null;
    try {
      answerError = await saveMissionAnswer(supabase, id, normalized.data.verification_mode, expected_answer);
    } catch {
      answerError = 'The expected answer could not be saved.';
    }
    if (answerError) {
      return {
        data,
        error: 'Your mission was updated, but its expected answer did not save. Edit it to try again.',
        stale: false,
        queued: false
      };
    }
  }

  if (hasRewardFields(normalized.data)) {
    let rewardError: string | null;
    try {
      rewardError = await saveMissionReward(supabase, id, {
        reward_kind: normalized.data.reward_kind ?? null,
        reward_body,
        reward_closer_body
      });
    } catch {
      rewardError = 'The reward payload could not be saved.';
    }
    if (rewardError) {
      return {
        data,
        error: 'Your mission was updated, but its promise did not save. Edit it to try again.',
        stale: false,
        queued: false
      };
    }
  }

  return result(data);
}

export async function getMissionReward(missionId: string): Promise<MissionResult<MissionReward>> {
  if (!validId(missionId)) return fail<MissionReward>('A mission id is required.');
  if (!canSpendBandwidth()) return fail<MissionReward>('The channel is quiet from here. Try opening this reward again when you have signal.');

  const supabase = getSupabase();
  if (!supabase) return fail<MissionReward>('The channel is quiet from here. Try opening this reward again when you have signal.');

  try {
    const { data, error } = await supabase.rpc('mission_reward', { p_mission_id: missionId });
    if (error) throw error;
    return result(data as MissionReward);
  } catch (error) {
    return fail<MissionReward>(
      isConnectivityError(error) ? 'The channel is quiet from here. Try opening this reward again when you have signal.' : errorMessage(error, 'That reward could not be opened right now.')
    );
  }
}

export async function getMissionRewardPayload(missionId: string): Promise<MissionResult<MissionRewardPayload>> {
  if (!validId(missionId)) return fail<MissionRewardPayload>('A mission id is required.');
  if (!canSpendBandwidth()) return fail<MissionRewardPayload>('The channel is quiet from here. Try again when you have signal.');

  const supabase = getSupabase();
  if (!supabase) return fail<MissionRewardPayload>('The channel is quiet from here. Try again when you have signal.');

  try {
    const { data, error } = await supabase.from('mission_rewards').select('body, closer_body').eq('mission_id', missionId).maybeSingle();
    if (error) throw error;
    return result({
      body: typeof data?.body === 'string' ? data.body : '',
      closer_body: typeof data?.closer_body === 'string' ? data.closer_body : null
    });
  } catch (error) {
    return fail<MissionRewardPayload>(
      isConnectivityError(error) ? 'The channel is quiet from here. Try again when you have signal.' : errorMessage(error, 'That reward could not be loaded right now.')
    );
  }
}

export async function getMissionExpectedAnswer(missionId: string): Promise<MissionResult<MissionExpectedAnswer>> {
  if (!validId(missionId)) return fail<MissionExpectedAnswer>('A mission id is required.');
  if (!canSpendBandwidth()) return fail<MissionExpectedAnswer>('The channel is quiet from here. Try again when you have signal.');

  const supabase = getSupabase();
  if (!supabase) return fail<MissionExpectedAnswer>('The channel is quiet from here. Try again when you have signal.');

  try {
    const { data, error } = await supabase.from('mission_answers').select('answer_norm').eq('mission_id', missionId).maybeSingle();
    if (error) throw error;
    return result({ answer_norm: typeof data?.answer_norm === 'string' ? data.answer_norm : '' });
  } catch (error) {
    return fail<MissionExpectedAnswer>(
      isConnectivityError(error) ? 'The channel is quiet from here. Try again when you have signal.' : errorMessage(error, 'That expected answer could not be loaded right now.')
    );
  }
}

export async function getQuestShape(questId: string): Promise<MissionResult<QuestShape>> {
  if (!validId(questId)) return fail<QuestShape>('A quest id is required.');
  if (!canSpendBandwidth()) return fail<QuestShape>('The channel is quiet from here. Try opening this quest again when you have signal.');

  const supabase = getSupabase();
  if (!supabase) return fail<QuestShape>('The channel is quiet from here. Try opening this quest again when you have signal.');

  try {
    const { data, error } = await supabase.rpc('quest_shape', { p_quest_id: questId });
    if (error) throw error;
    return result(data as QuestShape);
  } catch (error) {
    return fail<QuestShape>(
      isConnectivityError(error) ? 'The channel is quiet from here. Try opening this quest again when you have signal.' : errorMessage(error, 'That quest could not be opened right now.')
    );
  }
}

export async function getQuestShapes(questIds: string[]): Promise<Record<string, QuestShape>> {
  const ids = [...new Set(questIds.filter(validId))];
  if (!ids.length || !canSpendBandwidth()) return {};

  const supabase = getSupabase();
  if (!supabase) return {};

  try {
    const { data, error } = await supabase.rpc('quest_shapes', { p_quest_ids: ids });
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) return {};
    return data as Record<string, QuestShape>;
  } catch {
    return {};
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
  kind: 'release' | 'approve' | 'reject'
): Promise<MissionResult<Claim>> {
  if (!validId(claimId)) return fail<Claim>('A claim id is required.');

  const timestamp = new Date().toISOString();
  const payload: OutboxPayload =
    kind === 'approve'
      ? { claimId, doneAt: timestamp }
      : kind === 'release'
        ? { claimId, releasedAt: timestamp }
        : { claimId };

  if (!canSpendBandwidth()) return queued<Claim>(kind, payload);

  const userId = await ensureSignedIn();
  const supabase = getSupabase();
  if (!userId || !supabase) return queued<Claim>(kind, payload);

  const update =
    kind === 'approve'
      ? { state: 'done', done_at: timestamp }
      : kind === 'release'
        ? { state: 'released', released_at: timestamp }
        : { state: 'claimed', done_at: null };

  try {
    const { data, error } = await supabase.from('mission_claims').update(update).eq('id', claimId).select().single();
    if (error) throw error;
    return result(data as Claim);
  } catch (error) {
    return isConnectivityError(error) ? queued<Claim>(kind, payload) : fail<Claim>(errorMessage(error));
  }
}

export function releaseClaim(claimId: string) {
  return changeClaimState(claimId, 'release');
}

export async function submitClaim(
  claimId: string,
  text: string,
  verificationMode: VerificationMode
): Promise<MissionResult<SubmitClaimResult>> {
  if (!validId(claimId)) return fail<SubmitClaimResult>('A claim id is required.');

  const payload: OutboxPayload = { claimId, text };
  if (!canSpendBandwidth()) {
    if (verificationMode === 'answer') return fail<SubmitClaimResult>('You need signal to check that answer.');
    return queued<SubmitClaimResult>('submit', payload);
  }

  const userId = await ensureSignedIn();
  const supabase = getSupabase();
  if (!userId || !supabase) {
    if (verificationMode === 'answer') return fail<SubmitClaimResult>('You need signal to check that answer.');
    return queued<SubmitClaimResult>('submit', payload);
  }

  try {
    const { data, error } = await supabase.rpc('submit_claim', { p_claim_id: claimId, p_text: text });
    if (error) throw error;
    return result(data as SubmitClaimResult);
  } catch (error) {
    if (verificationMode !== 'answer' && isConnectivityError(error)) return queued<SubmitClaimResult>('submit', payload);
    return fail<SubmitClaimResult>(errorMessage(error));
  }
}

export function approveClaim(claimId: string) {
  return changeClaimState(claimId, 'approve');
}

export function rejectClaim(claimId: string) {
  return changeClaimState(claimId, 'reject');
}
