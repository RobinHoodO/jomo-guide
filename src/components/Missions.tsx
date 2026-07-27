import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent } from 'react';
import { MissionFilterBar, type MissionFilters } from './MissionFilterBar';
import { MissionForm } from './MissionForm';
import { SwipeableCard } from './SwipeableCard';
import { useFavorites } from '../hooks/useFavorites';
import { useHidden } from '../hooks/useHidden';
import { parseGridCode } from '../lib/events';
import {
  approveClaim,
  claimMission,
  createMission,
  deleteMission,
  getMissionReward,
  listMissions,
  markClaimDone,
  rejectClaim,
  releaseClaim,
  submitClaim,
  updateMission,
  type Claim,
  type CreateMissionInput,
  type Mission,
  type MissionListResult,
  type MissionReward,
  type MissionWithClaims
} from '../lib/missions';
import { canClaimHere } from '../lib/mission-rules';
import { canonicalCell } from '../lib/geo';
import { canSpendBandwidth } from '../lib/network';
import { flushOutbox, getSnapshot as getOutboxSnapshot, subscribe as subscribeOutbox } from '../lib/outbox';
import { ensureSignedIn, getSupabase } from '../lib/supabase';
import { CELL_SOURCE, getCurrentCell, getCurrentCellSnapshot, subscribeCurrentCell } from '../lib/whereami';

const ANONYMOUS_BURNER = 'Anonymous burner';
const EMPTY_MISSION_FILTERS: MissionFilters = {
  query: '',
  capacityTypes: [],
  hereOnly: false,
  needsApproval: false,
  hasPrize: false,
  starred: false,
  sort: 'newest'
};

type MissionsProps = {
  onSelectGrid: (grid: string) => void;
  onSelectCamp: (campId: string) => void;
  selectedMission: { id: string; token: number } | null;
};

type FormState = 'create' | Mission | null;

function capacityLabel(mission: MissionWithClaims) {
  if (mission.capacity_type === 'open') return 'open to everyone';
  if (mission.capacity_type === 'exclusive') return 'one person only';

  return `${mission.spotsLeft ?? 0} of ${mission.capacity ?? 0} spots left`;
}

function isExpired(mission: MissionWithClaims) {
  if (!mission.expires_at) return false;

  const expiresAt = new Date(mission.expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function isActiveClaim(claim: Claim) {
  return claim.state !== 'released';
}

function unavailabilityReason(mission: MissionWithClaims): null | 'closed' | 'expired' | 'done' | 'full' {
  if (mission.is_closed) return 'closed';
  if (isExpired(mission)) return 'expired';
  if (mission.myClaim?.state === 'done') return 'done';
  const activeClaimCount = mission.claims.filter(isActiveClaim).length;
  if (mission.capacity_type === 'limited' && activeClaimCount >= (mission.capacity ?? 0)) return 'full';
  if (mission.capacity_type === 'exclusive' && activeClaimCount > 0) return 'full';
  return null;
}

function isUnavailable(mission: MissionWithClaims) {
  return unavailabilityReason(mission) !== null;
}

function unavailabilityLabel(reason: Exclude<ReturnType<typeof unavailabilityReason>, null>) {
  return reason === 'done' ? 'you finished this' : reason;
}

function updateClaimOnMission(mission: MissionWithClaims, claim: Claim, userId: string | null): MissionWithClaims {
  const claims = mission.claims.some((item) => item.id === claim.id)
    ? mission.claims.map((item) => (item.id === claim.id ? claim : item))
    : [...mission.claims, claim];
  const activeClaimCount = claims.filter(isActiveClaim).length;
  const capacity = mission.capacity_type === 'open' ? null : mission.capacity;

  return {
    ...mission,
    claims,
    activeClaimCount,
    spotsLeft: capacity === null ? null : Math.max(0, capacity - activeClaimCount),
    myClaim: claim.claimer_id === userId ? (claim.state === 'released' ? null : claim) : mission.myClaim
  };
}

function missionPatch(input: CreateMissionInput): Partial<Mission> {
  return {
    title: input.title.trim(),
    description: input.description ?? '',
    capacity_type: input.capacity_type,
    capacity: input.capacity_type === 'limited' ? input.capacity ?? null : input.capacity_type === 'exclusive' ? 1 : null,
    grid_ref: input.grid_ref ?? null,
    requires_presence: input.requires_presence ?? false,
    requires_verification: input.requires_verification ?? false,
    expires_at: input.expires_at ?? null,
    reward_kind: input.reward_kind ?? null,
    reward_threshold: input.reward_threshold ?? null
  };
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.25 14.75 8.82l6.15.9-4.45 4.34 1.05 6.12L12 17.29l-5.5 2.89 1.05-6.12L3.1 9.72l6.15-.9L12 3.25Z" />
    </svg>
  );
}

function MissionCard({
  mission,
  creatorName,
  isFavorite,
  isYours,
  isTakenOn,
  isQueuedClaim,
  readOnly,
  busy,
  currentCell,
  claimerNames,
  onSelectGrid,
  onToggleFavorite,
  onEdit,
  onClaim,
  onDone,
  onSubmit,
  onRelease,
  onApprove,
  onReject
}: {
  mission: MissionWithClaims;
  creatorName: string;
  isFavorite: boolean;
  isYours: boolean;
  isTakenOn: boolean;
  isQueuedClaim: boolean;
  readOnly: boolean;
  busy: boolean;
  currentCell: string | null;
  claimerNames: Record<string, string>;
  onSelectGrid: (grid: string) => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onClaim: () => void;
  onDone: (claim: Claim) => void;
  onSubmit: (claim: Claim) => void;
  onRelease: (claim: Claim) => void;
  onApprove: (claim: Claim) => void;
  onReject: (claim: Claim) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reward, setReward] = useState<MissionReward | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [loadingReward, setLoadingReward] = useState(false);
  const unavailableReason = unavailabilityReason(mission);
  const claimNeedsSignal = mission.capacity_type !== 'open' && !canSpendBandwidth();
  const canClaim = !isYours && !mission.myClaim && !isQueuedClaim && !unavailableReason;
  // Presence is a client-side game rule, not server enforcement.
  const claimHere = canClaimHere(mission, currentCell, canonicalCell);
  const submittedClaims = mission.claims.filter((claim) => claim.state === 'submitted');
  const doneCount = mission.claims.filter((claim) => claim.state === 'done').length;

  const toggleExpanded = () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);

    if (!nextExpanded || !mission.reward_kind) return;

    setLoadingReward(true);
    setRewardError(null);
    setReward(null);
    void getMissionReward(mission.id).then((result) => {
      setLoadingReward(false);
      if (result.error) {
        setRewardError(result.error);
        return;
      }

      setReward(result.data);
    });
  };

  return (
    <article
      data-mission-id={mission.id}
      className={`event-card ${expanded ? 'is-expanded' : 'is-collapsed'}`}
      style={{ '--category-color': isTakenOn ? 'var(--yellow)' : 'var(--pink)' } as CSSProperties}
    >
      <div className="flex cursor-pointer items-start gap-2.5" onClick={toggleExpanded}>
        <div className="min-w-0 flex-1">
          <div className="event-meta-row">
            {mission.grid_ref ? (
              <button
                type="button"
                className="grid-badge inline-flex min-h-10 items-center"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectGrid(mission.grid_ref!);
                }}
                title={`Show ${mission.grid_ref} on the map`}
              >
                {mission.grid_ref}
              </button>
            ) : null}
            {mission.requires_presence && mission.grid_ref ? <span className="soft-badge">here only · {mission.grid_ref}</span> : null}
            <span className="soft-badge truncate">{capacityLabel(mission)}</span>
            {unavailableReason ? <span className="soft-badge">{unavailabilityLabel(unavailableReason)}</span> : null}
          </div>
          <button
            type="button"
            className="event-title-button"
            onClick={(event) => {
              event.stopPropagation();
              toggleExpanded();
            }}
            aria-expanded={expanded}
            title="Open / close"
          >
            <h3 className="text-sm font-semibold leading-5 text-indigo-brand">{mission.title}</h3>
          </button>
          {mission.reward_kind && mission.reward_threshold ? (
            <p className="mt-1"><span className="soft-badge">unlocks at {mission.reward_threshold} · {doneCount} so far</span></p>
          ) : null}
          <p className="mt-1 text-xs leading-4 text-[var(--muted-indigo)]">Posted by {creatorName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {isYours ? <span className="soft-badge shrink-0">yours</span> : null}
          <button
            type="button"
            className={`icon-button ${isFavorite ? 'is-active' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            aria-label={isFavorite ? 'Remove star from mission' : 'Star mission'}
            title={isFavorite ? 'Let this one go' : 'Keep this one'}
          >
            <StarIcon filled={isFavorite} />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="event-expanded space-y-2">
          {mission.description ? <p className="whitespace-pre-line text-sm leading-6 text-indigo-brand">{mission.description}</p> : null}
          {mission.expires_at ? (
            <p className="text-xs leading-5 text-[var(--muted-indigo)]">
              Expires {new Date(mission.expires_at).toLocaleString()}
            </p>
          ) : null}
          {mission.reward_kind ? (
            <div className="space-y-2">
              {loadingReward ? <p className="text-xs font-semibold text-[var(--muted-indigo)]">Opening the channel…</p> : null}
              {rewardError ? <p className="text-xs font-semibold text-pink">{rewardError}</p> : null}
              {reward ? (
                isYours ? (
                  <section className="glass space-y-2 p-3 text-cream">
                    <p className="section-kicker text-yellow">What people who finish will see</p>
                    {reward.body ? <p className="whitespace-pre-line text-sm leading-6">{reward.body}</p> : null}
                    {reward.kind === 'roster' ? <p className="text-sm leading-6">The finishers will become visible to one another.</p> : null}
                    {reward.closer_body ? (
                      <div className="border-t border-cream/25 pt-2">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-yellow">For the closer</p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-6">{reward.closer_body}</p>
                      </div>
                    ) : null}
                  </section>
                ) : !reward.has_reward || !reward.unlocked ? null : !reward.you_did_it ? (
                  <p className="text-sm font-semibold leading-6 text-[var(--muted-indigo)]">
                    It opened for the people who finished it.
                  </p>
                ) : (
                  <section className="glass space-y-3 p-3 text-cream">
                    <div>
                      <p className="section-kicker text-yellow">The channel opened</p>
                      <p className="display-heading mt-0.5 text-base text-cream">You made it through.</p>
                    </div>
                    {reward.body ? <p className="whitespace-pre-line text-sm leading-6">{reward.body}</p> : null}
                    {reward.roster.length ? (
                      <div className="border-t border-cream/25 pt-2">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-yellow">Who finished</p>
                        <ol className="mt-1 space-y-1 text-sm leading-5">
                          {reward.roster.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}
                        </ol>
                      </div>
                    ) : null}
                    {reward.you_closed_it && reward.closer_body ? (
                      <div className="border-t border-cream/25 pt-2">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-yellow">For the closer</p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-6">{reward.closer_body}</p>
                      </div>
                    ) : null}
                  </section>
                )
              ) : null}
            </div>
          ) : null}
          {isQueuedClaim ? <p className="text-xs font-semibold text-pink">Your open-mission claim is waiting for signal.</p> : null}
          {isTakenOn && mission.myClaim?.state === 'claimed' ? (
            <p className="text-xs font-semibold text-pink">You’ve got this one.</p>
          ) : null}
          {isTakenOn && mission.myClaim?.state === 'submitted' ? (
            <p className="text-xs font-semibold text-pink">Waiting for {creatorName} to confirm.</p>
          ) : null}
          {canClaim ? (
            <div className="space-y-1.5">
              <button
                type="button"
                className="min-h-10 rounded-full bg-pink px-4 text-xs font-black text-cream transition-colors hover:bg-yellow hover:text-indigo-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35 disabled:opacity-50"
                onClick={(event) => {
                  event.stopPropagation();
                  onClaim();
                }}
                disabled={readOnly || claimNeedsSignal || !claimHere || busy}
              >
                {busy ? 'Claiming…' : 'Claim mission'}
              </button>
              {!claimHere && mission.grid_ref ? (
                <p className="text-xs font-semibold text-pink">
                  Stand in {mission.grid_ref} to claim this one.{CELL_SOURCE === 'manual' ? ' (tap that square on the map)' : ''}
                </p>
              ) : null}
              {claimNeedsSignal ? <p className="text-xs font-semibold text-pink">You need signal to claim this one.</p> : null}
            </div>
          ) : null}
          {isYours ? (
            <button
              type="button"
              className="min-h-10 rounded-full border border-indigo-brand/20 px-4 text-xs font-black text-indigo-brand transition-colors hover:border-pink hover:text-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              disabled={readOnly}
            >
              Edit mission
            </button>
          ) : null}
          {isTakenOn && mission.myClaim?.state === 'claimed' ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="min-h-10 rounded-full bg-pink px-4 text-xs font-black text-cream transition-colors hover:bg-yellow hover:text-indigo-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35 disabled:opacity-50"
                onClick={(event) => {
                  event.stopPropagation();
                  if (mission.requires_verification) {
                    onSubmit(mission.myClaim!);
                  } else {
                    onDone(mission.myClaim!);
                  }
                }}
                disabled={readOnly || busy}
              >
                {busy ? 'Saving…' : mission.requires_verification ? 'Submit for approval' : 'Mark done'}
              </button>
              <button
                type="button"
                className="min-h-10 rounded-full border border-indigo-brand/20 px-4 text-xs font-black text-indigo-brand transition-colors hover:border-pink hover:text-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35 disabled:opacity-50"
                onClick={(event) => {
                  event.stopPropagation();
                  onRelease(mission.myClaim!);
                }}
                disabled={readOnly || busy}
              >
                Release
              </button>
            </div>
          ) : null}
          {isTakenOn && mission.myClaim?.state === 'submitted' ? (
            <button
              type="button"
              className="min-h-10 rounded-full border border-indigo-brand/20 px-4 text-xs font-black text-indigo-brand transition-colors hover:border-pink hover:text-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35 disabled:opacity-50"
              onClick={(event) => {
                event.stopPropagation();
                onRelease(mission.myClaim!);
              }}
              disabled={readOnly || busy}
            >
              Release
            </button>
          ) : null}
          {isYours && submittedClaims.length ? (
            <div className="space-y-2 border-t border-indigo-brand/15 pt-2">
              {submittedClaims.map((claim) => (
                <div key={claim.id} className="flex flex-wrap items-center gap-2 text-xs font-semibold text-indigo-brand">
                  <span className="mr-auto">{claimerNames[claim.claimer_id] ?? ANONYMOUS_BURNER}</span>
                  <button
                    type="button"
                    className="min-h-8 rounded-full bg-pink px-3 text-xs font-black text-cream transition-colors hover:bg-yellow hover:text-indigo-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35 disabled:opacity-50"
                    onClick={(event) => {
                      event.stopPropagation();
                      onApprove(claim);
                    }}
                    disabled={readOnly || busy}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="min-h-8 rounded-full border border-indigo-brand/20 px-3 text-xs font-black text-indigo-brand transition-colors hover:border-pink hover:text-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35 disabled:opacity-50"
                    onClick={(event) => {
                      event.stopPropagation();
                      onReject(claim);
                    }}
                    disabled={readOnly || busy}
                  >
                    Not yet
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function Missions({ onSelectGrid, onSelectCamp: _onSelectCamp, selectedMission }: MissionsProps) {
  const [missions, setMissions] = useState<MissionWithClaims[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [busyMissionId, setBusyMissionId] = useState<string | null>(null);
  const [queuedClaimIds, setQueuedClaimIds] = useState<Set<string>>(() => new Set());
  const [displayName, setDisplayName] = useState('');
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [filters, setFilters] = useState<MissionFilters>(EMPTY_MISSION_FILTERS);
  const { isFavorite: isMissionFavorite, toggleFavorite: toggleMissionFavorite } = useFavorites('jomo26:mission-favorites');
  const { hiddenIds, isHidden, hide, unhide, unhideAll } = useHidden('jomo26:mission-hidden');
  const [undoHide, setUndoHide] = useState<{ id: string; title: string } | null>(null);
  const [hiddenMissionTarget, setHiddenMissionTarget] = useState<string | null>(null);
  const undoTimer = useRef<number | null>(null);
  const missionHighlightTimer = useRef<number | null>(null);
  const highlightedMission = useRef<HTMLElement | null>(null);
  const handledMissionTargetToken = useRef<number | null>(null);
  const initialization = useRef<Promise<{ id: string | null; board: MissionListResult }> | null>(null);
  const outbox = useSyncExternalStore(subscribeOutbox, getOutboxSnapshot, getOutboxSnapshot);
  const currentCell = useSyncExternalStore(subscribeCurrentCell, getCurrentCellSnapshot, getCurrentCellSnapshot);

  useEffect(() => {
    return () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
      if (missionHighlightTimer.current !== null) window.clearTimeout(missionHighlightTimer.current);
      highlightedMission.current?.classList.remove('ring-2', 'ring-pink', 'ring-offset-2', 'ring-offset-navy');
    };
  }, []);

  const hideMission = useCallback(
    (mission: MissionWithClaims) => {
      hide(mission.id);
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
      setUndoHide({ id: mission.id, title: mission.title });
      undoTimer.current = window.setTimeout(() => {
        setUndoHide(null);
        undoTimer.current = null;
      }, 5000);
    },
    [hide]
  );

  const undoLastHide = () => {
    if (!undoHide) return;
    unhide(undoHide.id);
    setUndoHide(null);
    if (undoTimer.current !== null) {
      window.clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
  };

  const favoriteBySwipe = useCallback(
    (mission: MissionWithClaims) => {
      if (!isMissionFavorite(mission.id)) toggleMissionFavorite(mission.id);
    },
    [isMissionFavorite, toggleMissionFavorite]
  );

  useEffect(() => {
    if (!selectedMission) {
      setHiddenMissionTarget(null);
      return;
    }

    setFilters((current) => ({ ...EMPTY_MISSION_FILTERS, sort: current.sort }));
    setHiddenMissionTarget(isHidden(selectedMission.id) ? selectedMission.id : null);
  }, [isHidden, selectedMission?.id, selectedMission?.token]);

  const loadCreatorNames = useCallback(async (items: MissionWithClaims[]) => {
    if (!canSpendBandwidth()) return;

    const ids = [...new Set(items.flatMap((item) => [item.creator_id, ...item.claims.map((claim) => claim.claimer_id)]))];
    const supabase = getSupabase();
    if (!ids.length || !supabase) return;

    const { data, error } = await supabase.from('profiles').select('id, display_name').in('id', ids);
    if (error || !data) return;

    const names = Object.fromEntries(
      data.map((profile) => [profile.id, profile.display_name?.trim() || ANONYMOUS_BURNER])
    );
    setCreatorNames((current) => ({ ...current, ...names }));
  }, []);

  const applyBoard = useCallback(
    (result: MissionListResult) => {
      setMissions([...result.data].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setQueuedClaimIds((current) => {
        const stillWaiting = [...current].filter((id) => !result.data.some((mission) => mission.id === id && mission.myClaim));
        return new Set(stillWaiting);
      });
      setStale(result.stale);
      setBoardError(result.error);
      setLoading(false);
      void loadCreatorNames(result.data);
    },
    [loadCreatorNames]
  );

  const refreshBoard = useCallback(async () => {
    const result = await listMissions();
    applyBoard(result);
  }, [applyBoard]);

  const loadProfile = useCallback(async (id: string) => {
    setProfileLoaded(false);
    if (!canSpendBandwidth()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase.from('profiles').select('display_name').eq('id', id).maybeSingle();
    if (error) return;

    const name = data?.display_name?.trim();
    if (!name) return;

    setDisplayName(name);
    setDisplayNameDraft(name);
    setCreatorNames((current) => ({ ...current, [id]: name }));
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    let active = true;

    if (!initialization.current) {
      initialization.current = (async () => {
        const id = await ensureSignedIn();
        const board = await listMissions();
        return { id, board };
      })();
    }

    void initialization.current.then(({ id, board }) => {
      if (!active) return;

      setUserId(id);
      setAuthMessage(
        id
          ? null
          : canSpendBandwidth()
            ? 'Your mission identity is unavailable right now, so this board is read-only.'
            : 'You’re offline, so this is a saved read-only board.'
      );
      applyBoard(board);
      if (id) void loadProfile(id);
    });

    return () => {
      active = false;
    };
  }, [applyBoard, loadProfile]);

  useEffect(() => {
    const syncWhenPossible = () => {
      if (!canSpendBandwidth()) return;
      void flushOutbox().then(() => refreshBoard());
      if (userId) void loadProfile(userId);
    };

    window.addEventListener('online', syncWhenPossible);
    if (canSpendBandwidth() && outbox.pendingCount > 0) syncWhenPossible();

    return () => window.removeEventListener('online', syncWhenPossible);
  }, [loadProfile, outbox.pendingCount, refreshBoard, userId]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profileLoaded) {
      setProfileError('Your mission name is still loading.');
      return;
    }
    const name = displayNameDraft.trim();
    if (!name) {
      setProfileError('Your mission name can’t be empty.');
      return;
    }

    if (!userId || !canSpendBandwidth()) {
      setProfileError('You need signal to save your name.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setProfileError('Your name could not be saved right now.');
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    const { error } = await supabase.from('profiles').upsert({ id: userId, display_name: name }, { onConflict: 'id' });
    setSavingProfile(false);
    if (error) {
      setProfileError(error.message);
      return;
    }

    setDisplayName(name);
    setDisplayNameDraft(name);
    setCreatorNames((current) => ({ ...current, [userId]: name }));
  };

  const saveMission = async (input: CreateMissionInput) => {
    if (form === 'create') {
      const result = await createMission(input);
      if (result.data) {
        setMissions((current) => [
          {
            ...result.data!,
            claims: [],
            activeClaimCount: 0,
            spotsLeft: result.data!.capacity_type === 'open' ? null : result.data!.capacity,
            myClaim: null
          },
          ...current
        ]);
        if (userId && displayName) setCreatorNames((current) => ({ ...current, [userId]: displayName }));
      }

      if (result.error) {
        if (result.data) {
          setActionNotice(result.error);
          return null;
        }
        return result.error;
      }

      setActionNotice(result.queued ? 'Mission saved here and waiting for signal.' : 'Mission created.');
      return null;
    }

    if (!form) return 'Choose a mission to edit.';

    const result = await updateMission(form.id, input);
    if (result.error) return result.error;

    const patch = result.data ?? missionPatch(input);
    setMissions((current) => current.map((mission) => (mission.id === form.id ? { ...mission, ...patch } : mission)));
    setActionNotice(result.queued ? 'Mission changes are waiting for signal.' : 'Mission updated.');
    return null;
  };

  const removeMission = async () => {
    if (!form || form === 'create') return 'Choose a mission to delete.';

    const result = await deleteMission(form.id);
    if (result.error) return result.error;

    setMissions((current) => current.filter((mission) => mission.id !== form.id));
    setActionNotice(result.queued ? 'Deletion is waiting for signal.' : 'Mission deleted.');
    return null;
  };

  const claim = async (mission: MissionWithClaims) => {
    setBusyMissionId(mission.id);
    const result = await claimMission(mission.id, mission.capacity_type);
    setBusyMissionId(null);

    if (result.error) {
      setActionNotice(result.error === 'Claiming requires a live connection.' ? 'You need signal to claim this one.' : result.error);
      return;
    }

    if (result.queued) {
      setQueuedClaimIds((current) => new Set(current).add(mission.id));
      setActionNotice('Your open-mission claim is waiting for signal.');
      return;
    }

    if (result.data) {
      setMissions((current) => current.map((item) => (item.id === mission.id ? updateClaimOnMission(item, result.data!, userId) : item)));
      setActionNotice('Mission claimed.');
    }
  };

  const changeClaim = async (
    mission: MissionWithClaims,
    claimToChange: Claim,
    action: 'done' | 'release' | 'submit' | 'approve' | 'reject'
  ) => {
    setBusyMissionId(mission.id);
    const result =
      action === 'done'
        ? await markClaimDone(claimToChange.id)
        : action === 'release'
          ? await releaseClaim(claimToChange.id)
          : action === 'submit'
            ? await submitClaim(claimToChange.id)
            : action === 'approve'
              ? await approveClaim(claimToChange.id)
              : await rejectClaim(claimToChange.id);
    setBusyMissionId(null);

    if (result.error) {
      setActionNotice(result.error);
      return;
    }

    const claim = result.data ?? {
      ...claimToChange,
      state:
        action === 'done' || action === 'approve'
          ? 'done'
          : action === 'release'
            ? 'released'
            : action === 'submit'
              ? 'submitted'
              : 'claimed',
      done_at: action === 'done' || action === 'approve' ? new Date().toISOString() : action === 'release' ? claimToChange.done_at : null,
      released_at: action === 'release' ? new Date().toISOString() : claimToChange.released_at
    };
    setMissions((current) => current.map((item) => (item.id === mission.id ? updateClaimOnMission(item, claim, userId) : item)));
    setActionNotice(
      result.queued
        ? `${action === 'done' ? 'Done' : action === 'release' ? 'Release' : action === 'submit' ? 'Submission' : action === 'approve' ? 'Approval' : 'Response'} is waiting for signal.`
        : action === 'done'
          ? 'Marked done.'
          : action === 'release'
            ? 'Mission released.'
            : action === 'submit'
              ? 'Submitted for approval.'
              : action === 'approve'
                ? 'Claim approved.'
                : 'Sent back for more work.'
    );
  };

  const filterAndSortMissions = useCallback(
    (items: MissionWithClaims[]) => {
      const query = filters.query.trim().toLowerCase();
      const currentGrid = parseGridCode(getCurrentCell() ?? '');
      const newestFirst = (a: MissionWithClaims, b: MissionWithClaims) => b.created_at.localeCompare(a.created_at);

      return items
        .filter((mission) => {
          if (filters.capacityTypes.length && !filters.capacityTypes.includes(mission.capacity_type)) return false;
          if (filters.hereOnly && !mission.requires_presence) return false;
          if (filters.needsApproval && !mission.requires_verification) return false;
          if (filters.hasPrize && !mission.reward_kind) return false;
          if (filters.starred && !isMissionFavorite(mission.id)) return false;
          if (!query) return true;
          return `${mission.title} ${mission.description}`.toLowerCase().includes(query);
        })
        .sort((a, b) => {
          if (filters.sort === 'oldest') return a.created_at.localeCompare(b.created_at);
          if (filters.sort === 'closest' && currentGrid) {
            const gridA = parseGridCode(a.grid_ref ?? '');
            const gridB = parseGridCode(b.grid_ref ?? '');
            if (gridA && gridB) {
              const distanceA = Math.max(Math.abs(gridA.columnIndex - currentGrid.columnIndex), Math.abs(gridA.row - currentGrid.row));
              const distanceB = Math.max(Math.abs(gridB.columnIndex - currentGrid.columnIndex), Math.abs(gridB.row - currentGrid.row));
              return distanceA - distanceB || newestFirst(a, b);
            }
            if (gridA) return -1;
            if (gridB) return 1;
          }
          if (filters.sort === 'expiring') {
            const expiresA = a.expires_at ? new Date(a.expires_at).getTime() : Number.NaN;
            const expiresB = b.expires_at ? new Date(b.expires_at).getTime() : Number.NaN;
            const hasExpiryA = Number.isFinite(expiresA);
            const hasExpiryB = Number.isFinite(expiresB);
            if (hasExpiryA && hasExpiryB) return expiresA - expiresB || newestFirst(a, b);
            if (hasExpiryA) return -1;
            if (hasExpiryB) return 1;
          }
          return newestFirst(a, b);
        });
    },
    [currentCell, filters, isMissionFavorite]
  );
  const visibleMissions = useMemo(() => missions.filter((mission) => !isHidden(mission.id)), [isHidden, missions]);
  const takenOnMissions = visibleMissions.filter(
    (mission) =>
      mission.creator_id !== userId &&
      (mission.myClaim?.state === 'claimed' || mission.myClaim?.state === 'submitted' || queuedClaimIds.has(mission.id))
  );
  const yours = filterAndSortMissions(visibleMissions.filter((mission) => mission.creator_id === userId));
  const takenOn = filterAndSortMissions(takenOnMissions);
  const open = filterAndSortMissions(
    visibleMissions.filter(
      (mission) => mission.creator_id !== userId && !takenOnMissions.includes(mission) && !isUnavailable(mission)
    )
  );
  const taken = filterAndSortMissions(
    visibleMissions.filter(
      (mission) => mission.creator_id !== userId && !takenOnMissions.includes(mission) && isUnavailable(mission)
    )
  );
  const readOnly = !userId;
  const hasMissions = missions.length > 0;

  useEffect(() => {
    if (!selectedMission || loading || isHidden(selectedMission.id)) return;
    if (handledMissionTargetToken.current === selectedMission.token) return;
    if (!missions.some((mission) => mission.id === selectedMission.id)) return;

    const frame = window.requestAnimationFrame(() => {
      if (taken.some((mission) => mission.id === selectedMission.id)) {
        document.querySelector<HTMLDetailsElement>('[data-taken-missions]')?.setAttribute('open', '');
      }

      const card = Array.from(document.querySelectorAll<HTMLElement>('[data-mission-id]')).find(
        (item) => item.dataset.missionId === selectedMission.id
      );
      if (!card) return;

      handledMissionTargetToken.current = selectedMission.token;
      if (missionHighlightTimer.current !== null) window.clearTimeout(missionHighlightTimer.current);
      highlightedMission.current?.classList.remove('ring-2', 'ring-pink', 'ring-offset-2', 'ring-offset-navy');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ring-2', 'ring-pink', 'ring-offset-2', 'ring-offset-navy');
      highlightedMission.current = card;
      missionHighlightTimer.current = window.setTimeout(() => {
        card.classList.remove('ring-2', 'ring-pink', 'ring-offset-2', 'ring-offset-navy');
        missionHighlightTimer.current = null;
        highlightedMission.current = null;
      }, 2000);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isHidden, loading, missions, selectedMission, taken]);

  const renderMission = (mission: MissionWithClaims, section: 'yours' | 'takenOn' | 'open' | 'taken') => (
    <SwipeableCard
      key={mission.id}
      onHide={() => hideMission(mission)}
      onSwipeFavorite={() => favoriteBySwipe(mission)}
    >
      <MissionCard
        mission={mission}
        creatorName={creatorNames[mission.creator_id] ?? ANONYMOUS_BURNER}
        isFavorite={isMissionFavorite(mission.id)}
        isYours={section === 'yours'}
        isTakenOn={section === 'takenOn'}
        isQueuedClaim={queuedClaimIds.has(mission.id)}
        readOnly={readOnly}
        busy={busyMissionId === mission.id}
        currentCell={currentCell}
        claimerNames={creatorNames}
        onSelectGrid={onSelectGrid}
        onToggleFavorite={() => toggleMissionFavorite(mission.id)}
        onEdit={() => setForm(mission)}
        onClaim={() => void claim(mission)}
        onDone={(claimToChange) => void changeClaim(mission, claimToChange, 'done')}
        onSubmit={(claimToChange) => void changeClaim(mission, claimToChange, 'submit')}
        onRelease={(claimToChange) => void changeClaim(mission, claimToChange, 'release')}
        onApprove={(claimToChange) => void changeClaim(mission, claimToChange, 'approve')}
        onReject={(claimToChange) => void changeClaim(mission, claimToChange, 'reject')}
      />
    </SwipeableCard>
  );

  return (
    <div id="missions-tab" className="space-y-5 scroll-mt-4">
      <section className="space-y-1.5">
        <p className="section-kicker">Missions</p>
        <h2 className="display-heading text-lg">Small invitations, real people</h2>
        <p className="text-sm leading-5 text-cream">Offer a tiny adventure, take one on, and let it be enough.</p>
      </section>

      {hiddenMissionTarget ? (
        <div className="glass flex items-center justify-between gap-3 px-3 py-2 text-xs leading-4 text-cream" role="status">
          <p>That mission is hidden.</p>
          <button
            type="button"
            className="min-h-8 shrink-0 rounded-full bg-pink px-3 text-xs font-black text-cream transition-colors duration-200 hover:bg-yellow hover:text-indigo-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/60"
            onClick={() => unhide(hiddenMissionTarget)}
          >
            Restore mission
          </button>
        </div>
      ) : null}

      <MissionFilterBar
        filters={filters}
        setFilters={setFilters}
        hiddenCount={hiddenIds.length}
        onRestoreHidden={unhideAll}
      />

      <section className="glass filter-glass space-y-2 p-3">
        <form className="flex flex-wrap items-end gap-2" onSubmit={saveProfile}>
          <label className="min-w-0 flex-1 text-xs font-black uppercase tracking-[0.12em] text-cream" htmlFor="mission-display-name">
            Your mission name
            <input
              id="mission-display-name"
              className="mt-1 min-h-10 w-full rounded-xl border border-cream/25 bg-navy/30 px-3 text-sm font-semibold normal-case tracking-normal text-cream outline-none focus:border-pink focus:ring-2 focus:ring-pink/25 disabled:opacity-60"
              value={displayNameDraft}
              onChange={(event) => {
                setDisplayNameDraft(event.target.value);
                setProfileError(null);
              }}
              disabled={readOnly || !profileLoaded}
              placeholder={profileLoaded ? undefined : 'Loading your mission name…'}
            />
          </label>
          <button
            type="submit"
            className="min-h-10 rounded-full bg-cream px-4 text-xs font-black text-indigo-brand transition-colors hover:bg-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/60 disabled:opacity-50"
            disabled={readOnly || !profileLoaded || savingProfile}
          >
            {savingProfile ? 'Saving…' : 'Save name'}
          </button>
        </form>
        {profileError ? <p className="text-xs font-semibold text-pink">{profileError}</p> : null}
      </section>

      {authMessage ? <p className="px-1 text-xs leading-5 text-cream/75">{authMessage}</p> : null}
      {stale ? <p className="px-1 text-xs leading-5 text-cream/75">Showing your last synced copy.</p> : null}
      {boardError && !stale ? <p className="px-1 text-xs leading-5 text-cream/75">{boardError}</p> : null}
      {outbox.pendingCount > 0 ? (
        <p className="px-1 text-xs leading-5 text-cream/75">
          {outbox.pendingCount} change{outbox.pendingCount === 1 ? '' : 's'} waiting for signal.
        </p>
      ) : null}
      {actionNotice ? <p className="px-1 text-xs font-semibold leading-5 text-cream" role="status">{actionNotice}</p> : null}

      {form ? (
        <MissionForm
          key={form === 'create' ? 'create' : form.id}
          mission={form === 'create' ? null : form}
          onClose={() => setForm(null)}
          onSave={saveMission}
          onDelete={form === 'create' ? undefined : removeMission}
        />
      ) : hasMissions ? (
        <button
          type="button"
          className="min-h-10 rounded-full bg-pink px-4 text-xs font-black text-cream transition-colors hover:bg-yellow hover:text-indigo-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35 disabled:opacity-50"
          onClick={() => setForm('create')}
          disabled={readOnly}
        >
          Create a mission
        </button>
      ) : null}

      {loading ? <p className="mission-loading px-1 text-sm text-cream">Loading the board…</p> : null}

      {!loading && !hasMissions ? (
        <section className="panel-card space-y-3">
          <p className="text-sm leading-6 text-indigo-brand">No missions yet. Be the first to turn a small maybe into a shared adventure.</p>
          {!form ? (
            <button
              type="button"
              className="min-h-10 rounded-full bg-pink px-4 text-xs font-black text-cream transition-colors hover:bg-yellow hover:text-indigo-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35 disabled:opacity-50"
              onClick={() => setForm('create')}
              disabled={readOnly}
            >
              Create a mission
            </button>
          ) : null}
        </section>
      ) : null}

      {yours.length ? (
        <section className="space-y-2">
          <h3 className="display-heading text-base text-cream">Yours</h3>
          <div className="space-y-2">{yours.map((mission) => renderMission(mission, 'yours'))}</div>
        </section>
      ) : null}

      {takenOn.length ? (
        <section className="space-y-2">
          <h3 className="display-heading text-base text-cream">Taken on</h3>
          <div className="space-y-2">{takenOn.map((mission) => renderMission(mission, 'takenOn'))}</div>
        </section>
      ) : null}

      {open.length ? (
        <section className="space-y-2">
          <h3 className="display-heading text-base text-cream">Open</h3>
          <div className="space-y-2">{open.map((mission) => renderMission(mission, 'open'))}</div>
        </section>
      ) : null}

      {taken.length ? (
        <details className="glass filter-glass p-3" data-taken-missions>
          <summary className="min-h-10 cursor-pointer list-none py-2 text-sm font-black text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35">
            Taken ({taken.length})
          </summary>
          <div className="space-y-2 pt-2">{taken.map((mission) => renderMission(mission, 'taken'))}</div>
        </details>
      ) : null}

      {undoHide ? (
        <div className="toast snackbar" role="status" aria-live="polite">
          <span>Hidden. Enjoy missing out 🙈</span>
          <button type="button" className="snackbar-undo" onClick={undoLastHide}>
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
