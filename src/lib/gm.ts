import { ensureSignedIn, getSupabase } from './supabase';

export type HqClaimCounts = {
  claimed?: number;
  submitted?: number;
  done?: number;
  released?: number;
};

export type HqMission = {
  id: string;
  title: string;
  is_closed: boolean;
  capacity_type: string;
  verification_mode: string;
  expires_at: string | null;
  quest_id: string | null;
  quest_step: number | null;
  reward_kind: string | null;
  reward_threshold: number | null;
  claims: HqClaimCounts;
};

export type HqOverview = {
  players: {
    count: number;
    recent: Array<{ name: string | null; at: string | null }>;
  };
  missions: HqMission[];
  quests: Array<{
    quest_id: string;
    steps: Array<{ step: number; mission_id: string; title: string; done: number; forced: boolean }>;
  }>;
  notices: Array<{
    id: string;
    body: string;
    active: boolean;
    created_at: string;
    expires_at: string | null;
  }>;
  activity: Array<{
    state: string;
    claimed_at: string | null;
    submitted_at: string | null;
    done_at: string | null;
    note: string | null;
    mission: string | null;
    who: string | null;
  }>;
};

export type GmActionResult = { error: string | null };
export type OverviewResult = { data: HqOverview | null; unauthorized: boolean; error: string | null };

function errorMessage(error: unknown, fallback = 'HQ is unavailable right now.') {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

function isUnauthorized(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const status = 'status' in error && typeof error.status === 'number' ? error.status : null;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const messageSaysUnauthorized = /not authorized/i.test(errorMessage(error, ''));
  return (messageSaysUnauthorized && (status === null || (status >= 400 && status < 500))) || code === '42501';
}

async function rpcAction(name: string, args: Record<string, unknown>): Promise<GmActionResult> {
  const userId = await ensureSignedIn();
  const supabase = getSupabase();
  if (!userId || !supabase) return { error: 'HQ needs a live connection.' };

  try {
    const { error } = await supabase.rpc(name, args);
    return { error: error ? errorMessage(error) : null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function gmElevate(pass: string): Promise<boolean> {
  const userId = await ensureSignedIn();
  const supabase = getSupabase();
  if (!userId || !supabase) return false;

  try {
    const { data, error } = await supabase.rpc('gm_elevate', { p_pass: pass });
    return !error && data === true;
  } catch {
    return false;
  }
}

export async function getOverview(): Promise<OverviewResult> {
  const userId = await ensureSignedIn();
  const supabase = getSupabase();
  if (!userId || !supabase) return { data: null, unauthorized: false, error: 'HQ needs a live connection.' };

  try {
    const { data, error } = await supabase.rpc('hq_overview');
    if (error) {
      return {
        data: null,
        unauthorized: isUnauthorized(error),
        error: isUnauthorized(error) ? null : errorMessage(error)
      };
    }

    return { data: data as HqOverview, unauthorized: false, error: null };
  } catch (error) {
    return { data: null, unauthorized: isUnauthorized(error), error: isUnauthorized(error) ? null : errorMessage(error) };
  }
}

export function gmApproveClaim(claimId: string) {
  return rpcAction('gm_approve_claim', { p_claim_id: claimId });
}

export function gmReleaseClaim(claimId: string) {
  return rpcAction('gm_release_claim', { p_claim_id: claimId });
}

export function gmSetMissionClosed(missionId: string, closed: boolean) {
  return rpcAction('gm_set_mission_closed', { p_mission_id: missionId, p_closed: closed });
}

export function gmDeleteMission(missionId: string) {
  return rpcAction('gm_delete_mission', { p_mission_id: missionId });
}

export function gmForceAdvance(questId: string, step: number) {
  return rpcAction('gm_force_advance', { p_quest_id: questId, p_step: step });
}

export function gmPostNotice(body: string, expires: string | null) {
  return rpcAction('gm_post_notice', { p_body: body, p_expires: expires });
}

export function gmRetireNotice(id: string) {
  return rpcAction('gm_retire_notice', { p_id: id });
}
