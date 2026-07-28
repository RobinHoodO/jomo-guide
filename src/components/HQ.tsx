import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  getOverview,
  gmApproveClaim,
  gmDeleteMission,
  gmElevate,
  gmForceAdvance,
  gmPostNotice,
  gmRetireNotice,
  gmSetMissionClosed,
  type HqMission,
  type HqOverview
} from '../lib/gm';
import { ensureSignedIn, getSupabase } from '../lib/supabase';

type Embedded<T> = T | T[] | null;

type SubmittedClaim = {
  id: string;
  submission_note: string | null;
  submitted_at: string | null;
  claimer: Embedded<{ display_name: string | null }>;
  mission: Embedded<{ title: string | null; submission_prompt: string | null }>;
};

function embeddedRow<T>(value: Embedded<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function relativeTime(value: string | null | undefined) {
  if (!value) return '—';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '—';

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

function missionClaimChips(mission: HqMission) {
  const counts = mission.claims ?? {};
  return (['claimed', 'submitted', 'done', 'released'] as const)
    .filter((state) => (counts[state] ?? 0) > 0)
    .map((state) => `${state} ${counts[state]}`);
}

async function getSubmittedClaims(): Promise<{ data: SubmittedClaim[]; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { data: [], error: 'HQ needs a live connection.' };

  try {
    const { data, error } = await supabase
      .from('mission_claims')
      .select(
        'id, submission_note, submitted_at, claimer:profiles!mission_claims_claimer_id_fkey(display_name), mission:missions!mission_claims_mission_id_fkey(title, submission_prompt)'
      )
      .eq('state', 'submitted');

    return { data: (data ?? []) as SubmittedClaim[], error: error?.message ?? null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Approvals are unavailable right now.' };
  }
}

export default function HQ() {
  const [overview, setOverview] = useState<HqOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [pass, setPass] = useState('');
  const [elevationFailures, setElevationFailures] = useState(0);
  const [elevating, setElevating] = useState(false);
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeHours, setNoticeHours] = useState('');
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const [armedAction, setArmedAction] = useState<string | null>(null);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [submittedClaims, setSubmittedClaims] = useState<SubmittedClaim[]>([]);
  const armedTimer = useRef<number | null>(null);

  const loadSubmittedClaims = useCallback(async () => {
    const result = await getSubmittedClaims();
    if (result.error) {
      setError(result.error);
      return;
    }
    setSubmittedClaims(result.data);
  }, []);

  const loadOverview = useCallback(
    async (loadApprovals = approvalsOpen) => {
      setLoading(true);
      const result = await getOverview();
      if (result.unauthorized) {
        setOverview(null);
        setUnauthorized(true);
        setSubmittedClaims([]);
      } else if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setOverview(result.data);
        setUnauthorized(false);
        setLastRefreshed(new Date());

        const waiting = result.data.missions.reduce((total, mission) => total + (mission.claims?.submitted ?? 0), 0);
        if (loadApprovals && waiting > 0) await loadSubmittedClaims();
        if (waiting === 0) setSubmittedClaims([]);
      }
      setLoading(false);
    },
    [approvalsOpen, loadSubmittedClaims]
  );

  useEffect(() => {
    void (async () => {
      await ensureSignedIn();
      await loadOverview(false);
    })();
  }, [loadOverview]);

  useEffect(() => {
    return () => {
      if (armedTimer.current !== null) window.clearTimeout(armedTimer.current);
    };
  }, []);

  const refresh = () => {
    setError(null);
    void loadOverview();
  };

  const runAction = async (key: string, action: () => Promise<{ error: string | null }>) => {
    setActionInFlight(key);
    setError(null);
    const result = await action();
    if (result.error) setError(result.error);
    await loadOverview();
    setActionInFlight(null);
  };

  const armOrRun = (key: string, action: () => void) => {
    if (armedAction === key) {
      if (armedTimer.current !== null) window.clearTimeout(armedTimer.current);
      armedTimer.current = null;
      setArmedAction(null);
      action();
      return;
    }

    if (armedTimer.current !== null) window.clearTimeout(armedTimer.current);
    setArmedAction(key);
    armedTimer.current = window.setTimeout(() => {
      setArmedAction(null);
      armedTimer.current = null;
    }, 3_000);
  };

  const submitGate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pass.trim() || elevating) return;

    setElevating(true);
    setError(null);
    const elevated = await gmElevate(pass);
    setElevating(false);
    if (elevated) {
      setPass('');
      setElevationFailures(0);
      await loadOverview(false);
      return;
    }

    setElevationFailures((current) => current + 1);
  };

  const submitNotice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = noticeBody.trim();
    if (!body) return;

    let expires: string | null = null;
    if (noticeHours.trim()) {
      const hours = Number(noticeHours);
      if (!Number.isFinite(hours) || hours <= 0) {
        setError('Expiry must be a positive number of hours.');
        return;
      }
      expires = new Date(Date.now() + hours * 3_600_000).toISOString();
    }

    const key = 'post-notice';
    setActionInFlight(key);
    setError(null);
    const result = await gmPostNotice(body, expires);
    if (result.error) setError(result.error);
    else {
      setNoticeBody('');
      setNoticeHours('');
    }
    await loadOverview();
    setActionInFlight(null);
  };

  const waitingForApproval = overview?.missions.reduce((total, mission) => total + (mission.claims?.submitted ?? 0), 0) ?? 0;

  if (loading && !overview && !unauthorized) {
    return <main className="hq-page quant-shell"><div className="quant-terminal hq-terminal">&gt; connecting…</div></main>;
  }

  if (unauthorized) {
    return (
      <main className="hq-page quant-shell">
        <section className="quant-terminal hq-terminal" aria-labelledby="hq-gate-title">
          <p id="hq-gate-title" className="hq-kicker">QUANT HQ // ACCESS</p>
          <p>&gt; identify yourself.</p>
          <form className="quant-answer-form hq-gate-form" onSubmit={submitGate}>
            <label className="sr-only" htmlFor="hq-passphrase">Passphrase</label>
            <span aria-hidden="true">&gt;&nbsp;</span>
            <input
              id="hq-passphrase"
              type="password"
              autoComplete="current-password"
              value={pass}
              onChange={(event) => setPass(event.target.value)}
              placeholder="passphrase"
              disabled={elevating}
            />
            <button type="submit" disabled={elevating}>{elevating ? 'checking…' : 'enter'}</button>
          </form>
          {elevationFailures > 0 ? <p className="hq-error">&gt; no.{elevationFailures >= 3 ? ' Try later.' : ''}</p> : null}
          {error ? <p className="hq-error">&gt; {error}</p> : null}
        </section>
      </main>
    );
  }

  if (!overview) {
    return (
      <main className="hq-page quant-shell">
        <section className="quant-terminal hq-terminal">
          <p>&gt; {error ?? 'HQ unavailable.'}</p>
          <button type="button" className="hq-button" onClick={refresh}>retry</button>
        </section>
      </main>
    );
  }

  return (
    <main className="hq-page quant-shell">
      <div className="quant-terminal hq-terminal">
        <header className="hq-header">
          <div>
            <p className="hq-kicker">QUANT HQ</p>
            <p className="hq-refreshed">{lastRefreshed ? `updated ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'not refreshed'}</p>
          </div>
          <button type="button" className="hq-button" onClick={refresh} disabled={loading}>refresh</button>
        </header>

        {error ? <p className="hq-error">&gt; {error}</p> : null}

        {waitingForApproval > 0 ? (
          <section className="hq-approvals" aria-labelledby="hq-approvals-title">
            <button
              id="hq-approvals-title"
              type="button"
              className="hq-expand"
              aria-expanded={approvalsOpen}
              onClick={() => {
                const next = !approvalsOpen;
                setApprovalsOpen(next);
                if (next) void loadSubmittedClaims();
              }}
            >
              {waitingForApproval} waiting for approval {approvalsOpen ? '−' : '+'}
            </button>
            {approvalsOpen ? (
              <div className="hq-list">
                {submittedClaims.map((claim) => {
                  const key = `approve:${claim.id}`;
                  const claimer = embeddedRow(claim.claimer);
                  const mission = embeddedRow(claim.mission);
                  return (
                    <article className="hq-row" key={claim.id}>
                      <div>
                        <p>{claimer?.display_name?.trim() || 'unknown'} · {mission?.title || 'untitled mission'}</p>
                        {mission?.submission_prompt ? <p className="hq-dim">prompt: {mission.submission_prompt}</p> : null}
                        {claim.submission_note ? <p className="hq-note">{claim.submission_note}</p> : <p className="hq-dim">no note sent</p>}
                      </div>
                      <button type="button" className="hq-button" disabled={actionInFlight === key} onClick={() => void runAction(key, () => gmApproveClaim(claim.id))}>
                        {actionInFlight === key ? 'approving…' : 'approve'}
                      </button>
                    </article>
                  );
                })}
                {!submittedClaims.length ? <p className="hq-dim">loading submissions…</p> : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="hq-section" aria-labelledby="hq-players-title">
          <h2 id="hq-players-title">PLAYERS <span>{overview.players.count}</span></h2>
          <div className="hq-list">
            {overview.players.recent.slice(0, 20).map((player, index) => (
              <p className="hq-simple-row" key={`${player.name ?? 'unknown'}-${player.at ?? index}`}><span>{player.name?.trim() || 'unknown'}</span><time>{relativeTime(player.at)}</time></p>
            ))}
            {!overview.players.recent.length ? <p className="hq-dim">no burner activity yet</p> : null}
          </div>
        </section>

        <section className="hq-section" aria-labelledby="hq-notices-title">
          <h2 id="hq-notices-title">NOTICES</h2>
          <form className="hq-notice-form" onSubmit={submitNotice}>
            <label className="sr-only" htmlFor="hq-notice-body">Notice</label>
            <textarea id="hq-notice-body" value={noticeBody} onChange={(event) => setNoticeBody(event.target.value)} placeholder="broadcast a notice" rows={3} />
            <div className="hq-form-actions">
              <label>expires in <input type="number" min="0.1" step="0.1" inputMode="decimal" value={noticeHours} onChange={(event) => setNoticeHours(event.target.value)} placeholder="hours" /> h</label>
              <button type="submit" className="hq-button" disabled={actionInFlight === 'post-notice'}>{actionInFlight === 'post-notice' ? 'posting…' : 'post'}</button>
            </div>
          </form>
          <div className="hq-list">
            {overview.notices.filter((notice) => notice.active).map((notice) => {
              const key = `retire:${notice.id}`;
              return (
                <article className="hq-row" key={notice.id}>
                  <div><p>{notice.body}</p><p className="hq-dim">{notice.expires_at ? `expires ${relativeTime(notice.expires_at)}` : 'no expiry'}</p></div>
                  <button type="button" className="hq-button" disabled={actionInFlight === key} onClick={() => void runAction(key, () => gmRetireNotice(notice.id))}>{actionInFlight === key ? 'retiring…' : 'retire'}</button>
                </article>
              );
            })}
            {!overview.notices.some((notice) => notice.active) ? <p className="hq-dim">no active notices</p> : null}
          </div>
        </section>

        <section className="hq-section" aria-labelledby="hq-quests-title">
          <h2 id="hq-quests-title">QUESTS</h2>
          <div className="hq-list">
            {overview.quests.map((quest) => {
              const steps = [...quest.steps].sort((a, b) => a.step - b.step);
              const lastStep = steps.at(-1);
              return (
                <article className="hq-quest" key={quest.quest_id}>
                  <p className="hq-quest-id">{quest.quest_id}</p>
                  {steps.map((step) => {
                    const nextStep = step.step + 1;
                    const key = `force:${quest.quest_id}:${nextStep}`;
                    const isLast = step.mission_id === lastStep?.mission_id && step.step === lastStep.step;
                    return (
                      <div className="hq-quest-step" key={`${step.mission_id}-${step.step}`}>
                        <p>step {step.step} · {step.title} · done ×{step.done}{step.forced ? <span className="hq-tag">forced</span> : null}</p>
                        {isLast ? <button type="button" className="hq-button" disabled={actionInFlight === key} onClick={() => armOrRun(key, () => void runAction(key, () => gmForceAdvance(quest.quest_id, nextStep)))}>{actionInFlight === key ? 'opening…' : armedAction === key ? 'sure?' : `force open step ${nextStep}`}</button> : null}
                      </div>
                    );
                  })}
                </article>
              );
            })}
            {!overview.quests.length ? <p className="hq-dim">no quest chains</p> : null}
          </div>
        </section>

        <section className="hq-section" aria-labelledby="hq-missions-title">
          <h2 id="hq-missions-title">MISSIONS</h2>
          <div className="hq-list">
            {overview.missions.map((mission) => {
              const closeKey = `close:${mission.id}`;
              const deleteKey = `delete:${mission.id}`;
              const chips = missionClaimChips(mission);
              return (
                <article className="hq-row hq-mission" key={mission.id}>
                  <div>
                    <p>{mission.title}</p>
                    {chips.length ? <p className="hq-chips">{chips.map((chip) => <span key={chip}>{chip}</span>)}</p> : <p className="hq-dim">no claims</p>}
                    {mission.quest_id ? <p className="hq-tag">quest {mission.quest_id} · step {mission.quest_step ?? '?'}</p> : null}
                  </div>
                  <div className="hq-actions">
                    <button type="button" className="hq-button" disabled={actionInFlight === closeKey} onClick={() => void runAction(closeKey, () => gmSetMissionClosed(mission.id, !mission.is_closed))}>{actionInFlight === closeKey ? 'saving…' : mission.is_closed ? 'reopen' : 'close'}</button>
                    <button type="button" className="hq-button hq-danger" disabled={actionInFlight === deleteKey} onClick={() => armOrRun(deleteKey, () => void runAction(deleteKey, () => gmDeleteMission(mission.id)))}>{actionInFlight === deleteKey ? 'deleting…' : armedAction === deleteKey ? 'sure?' : 'delete'}</button>
                  </div>
                </article>
              );
            })}
            {!overview.missions.length ? <p className="hq-dim">no missions</p> : null}
          </div>
        </section>

        <section className="hq-section" aria-labelledby="hq-activity-title">
          <h2 id="hq-activity-title">ACTIVITY</h2>
          <div className="hq-list">
            {overview.activity.slice(0, 30).map((entry, index) => (
              <article className="hq-activity" key={`${entry.who ?? 'unknown'}-${entry.mission ?? 'mission'}-${entry.submitted_at ?? entry.done_at ?? entry.claimed_at ?? index}`}>
                <p>{entry.who || 'unknown'} · {entry.state} · {entry.mission || 'unknown mission'} · {relativeTime(entry.done_at ?? entry.submitted_at ?? entry.claimed_at)}</p>
                {entry.note ? <p className="hq-note">{entry.note}</p> : null}
              </article>
            ))}
            {!overview.activity.length ? <p className="hq-dim">no activity</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
