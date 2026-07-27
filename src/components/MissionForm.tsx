import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { getMissionRewardPayload, type CapacityType, type CreateMissionInput, type Mission, type RewardKind } from '../lib/missions';

type MissionFormProps = {
  mission: Mission | null;
  quest?: { questId: string; questStep: number };
  onClose: () => void;
  onSave: (input: CreateMissionInput) => Promise<string | null>;
  onDelete?: () => Promise<string | null>;
};

type FieldName = 'title' | 'description' | 'capacity' | 'presence' | 'expires' | 'reward' | 'form';

const REWARD_KINDS: Array<{ value: RewardKind; label: string; description: string }> = [
  { value: 'content', label: 'A message that appears', description: 'written now, revealed to everyone who finished' },
  { value: 'clue', label: 'The next clue', description: 'a square, a word, or the next mission' },
  { value: 'roster', label: 'Each other', description: 'no message; the people who finished simply become visible to one another' },
  { value: 'handover', label: 'Something handed over in person', description: 'say where and when; you bring the thing' }
];

function localDateTime(value: string | null) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function fieldForError(message: string): FieldName {
  if (/title/i.test(message)) return 'title';
  if (/description/i.test(message)) return 'description';
  if (/expiry/i.test(message)) return 'expires';
  if (/here-only|grid square/i.test(message)) return 'presence';
  if (/capacity|limited|exclusive|open missions/i.test(message)) return 'capacity';
  if (/reward|unlocks|finishers|what unlocks|closer/i.test(message)) return 'reward';
  return 'form';
}

export function MissionForm({ mission, quest, onClose, onSave, onDelete }: MissionFormProps) {
  const [title, setTitle] = useState(mission?.title ?? '');
  const [description, setDescription] = useState(mission?.description ?? '');
  const [capacityType, setCapacityType] = useState<CapacityType>(mission?.capacity_type ?? 'open');
  const [capacity, setCapacity] = useState(
    mission?.capacity_type === 'limited' && mission.capacity !== null ? String(mission.capacity) : ''
  );
  const [gridRef, setGridRef] = useState(mission?.grid_ref ?? '');
  const [requiresPresence, setRequiresPresence] = useState(mission?.requires_presence ?? false);
  const [requiresVerification, setRequiresVerification] = useState(mission?.requires_verification ?? false);
  const [expiresAt, setExpiresAt] = useState(localDateTime(mission?.expires_at ?? null));
  const [hasReward, setHasReward] = useState(Boolean(mission?.reward_kind));
  const [rewardKind, setRewardKind] = useState<RewardKind>(mission?.reward_kind ?? 'content');
  const [rewardThreshold, setRewardThreshold] = useState(String(mission?.reward_threshold ?? 3));
  const [rewardBody, setRewardBody] = useState('');
  const [rewardCloserBody, setRewardCloserBody] = useState('');
  const [loadingRewardPayload, setLoadingRewardPayload] = useState(Boolean(mission?.reward_kind));
  const [rewardPayloadReady, setRewardPayloadReady] = useState(!mission?.reward_kind);
  const [startsQuest, setStartsQuest] = useState(Boolean(quest || mission?.quest_id));
  const [questId, setQuestId] = useState(quest?.questId ?? mission?.quest_id ?? null);
  const [questReveal, setQuestReveal] = useState(mission?.quest_reveal ?? 'hint');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const minimumExpiry = localDateTime(new Date().toISOString());
  const questLocked = Boolean(quest || mission?.quest_id);
  const questStep = quest?.questStep ?? mission?.quest_step ?? (startsQuest ? 1 : null);
  const isQuestStep = startsQuest && questId !== null && questStep !== null;

  const clearError = (field: FieldName) => {
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  useEffect(() => {
    if (!mission?.reward_kind) {
      setLoadingRewardPayload(false);
      setRewardPayloadReady(true);
      return;
    }

    let active = true;
    setLoadingRewardPayload(true);
    setRewardPayloadReady(false);
    void getMissionRewardPayload(mission.id).then((result) => {
      if (!active) return;

      setLoadingRewardPayload(false);
      if (result.error) {
        setErrors((current) => ({ ...current, reward: result.error! }));
        return;
      }

      setRewardBody(result.data?.body ?? '');
      setRewardCloserBody(result.data?.closer_body ?? '');
      setRewardPayloadReady(true);
    });

    return () => {
      active = false;
    };
  }, [mission?.id, mission?.reward_kind]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const error = await onSave({
      title,
      description,
      capacity_type: capacityType,
      capacity: capacityType === 'limited' ? Number(capacity) : capacityType === 'exclusive' ? 1 : null,
      grid_ref: gridRef.trim() || null,
      requires_presence: requiresPresence,
      requires_verification: requiresVerification,
      expires_at: toIso(expiresAt),
      reward_kind: hasReward ? rewardKind : null,
      reward_threshold: hasReward ? Number(rewardThreshold) : null,
      reward_body: hasReward && rewardKind !== 'roster' ? rewardBody : null,
      reward_closer_body: hasReward ? rewardCloserBody : null,
      quest_id: isQuestStep ? questId : null,
      quest_step: isQuestStep ? questStep : null,
      quest_reveal: isQuestStep && questStep === 1 ? questReveal : null
    });

    setSaving(false);
    if (error) {
      const field = fieldForError(error);
      setErrors({ [field === 'capacity' && capacityType !== 'limited' ? 'form' : field]: error });
      return;
    }

    onClose();
  };

  const deleteMission = async () => {
    if (!onDelete) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }

    setSaving(true);
    const error = await onDelete();
    setSaving(false);
    if (error) {
      setErrors({ form: error });
      return;
    }

    onClose();
  };

  return (
    <section
      className="event-card is-expanded space-y-3"
      style={{ '--category-color': 'var(--pink)' } as CSSProperties}
    >
      <div>
        <p className="section-kicker text-pink">{mission ? 'Your mission' : 'New mission'}</p>
        <h3 className="display-heading mt-0.5 text-base text-indigo-brand">
          {mission ? 'Change the invitation' : 'Leave a tiny invitation'}
        </h3>
      </div>

      <form className="space-y-3" onSubmit={submit} noValidate>
        <section className="space-y-3">
          <p className="section-kicker text-pink">What</p>
          <label className="block text-sm font-semibold text-indigo-brand" htmlFor="mission-title">
            Title
            <input
              id="mission-title"
              className="mt-1 min-h-10 w-full rounded-xl border border-indigo-brand/20 bg-cream px-3 text-sm text-indigo-brand outline-none focus:border-pink focus:ring-2 focus:ring-pink/25"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                clearError('title');
              }}
              maxLength={140}
              required
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'mission-title-error' : undefined}
            />
            {errors.title ? <span id="mission-title-error" className="mt-1 block text-xs font-semibold text-pink">{errors.title}</span> : null}
          </label>

          <label className="block text-sm font-semibold text-indigo-brand" htmlFor="mission-description">
            Description <span className="font-normal text-[var(--muted-indigo)]">(optional)</span>
            <textarea
              id="mission-description"
              className="mt-1 min-h-24 w-full rounded-xl border border-indigo-brand/20 bg-cream px-3 py-2 text-sm leading-5 text-indigo-brand outline-none focus:border-pink focus:ring-2 focus:ring-pink/25"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                clearError('description');
              }}
              maxLength={4000}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? 'mission-description-error' : undefined}
            />
            {errors.description ? <span id="mission-description-error" className="mt-1 block text-xs font-semibold text-pink">{errors.description}</span> : null}
          </label>
        </section>

        <section className="space-y-3 border-t border-indigo-brand/15 pt-3">
          <p className="section-kicker text-pink">Who can take it on</p>
          <label className="block text-sm font-semibold text-indigo-brand" htmlFor="mission-capacity-type">
            Capacity
            <select
              id="mission-capacity-type"
              className="mt-1 min-h-10 w-full rounded-xl border border-indigo-brand/20 bg-cream px-3 text-sm text-indigo-brand outline-none focus:border-pink focus:ring-2 focus:ring-pink/25"
              value={capacityType}
              onChange={(event) => {
                setCapacityType(event.target.value as CapacityType);
                clearError('capacity');
              }}
            >
              <option value="open">Open to everyone</option>
              <option value="limited">Limited spots</option>
              <option value="exclusive">One person only</option>
            </select>
          </label>

          {capacityType === 'limited' ? (
            <label className="block text-sm font-semibold text-indigo-brand" htmlFor="mission-capacity">
              Number of spots
              <input
                id="mission-capacity"
                className="mt-1 min-h-10 w-full rounded-xl border border-indigo-brand/20 bg-cream px-3 text-sm text-indigo-brand outline-none focus:border-pink focus:ring-2 focus:ring-pink/25"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={capacity}
                onChange={(event) => {
                  setCapacity(event.target.value);
                  clearError('capacity');
                }}
                aria-invalid={Boolean(errors.capacity)}
                aria-describedby={errors.capacity ? 'mission-capacity-error' : undefined}
              />
              {errors.capacity ? <span id="mission-capacity-error" className="mt-1 block text-xs font-semibold text-pink">{errors.capacity}</span> : null}
            </label>
          ) : null}
        </section>

        <section className="space-y-3 border-t border-indigo-brand/15 pt-3">
          <p className="section-kicker text-pink">Where</p>
          <label className="block text-sm font-semibold text-indigo-brand" htmlFor="mission-grid-ref">
            Grid ref <span className="font-normal text-[var(--muted-indigo)]">(optional)</span>
            <input
              id="mission-grid-ref"
              className="mt-1 min-h-10 w-full rounded-xl border border-indigo-brand/20 bg-cream px-3 text-sm text-indigo-brand outline-none focus:border-pink focus:ring-2 focus:ring-pink/25"
              value={gridRef}
              onChange={(event) => {
                setGridRef(event.target.value);
                clearError('presence');
              }}
              placeholder="e.g. F4"
            />
          </label>

          <div className="space-y-1">
            <label className="flex items-start gap-2 text-sm font-semibold text-indigo-brand">
              <input
                className="mt-0.5 size-4 accent-pink"
                type="checkbox"
                checked={requiresPresence}
                onChange={(event) => {
                  setRequiresPresence(event.target.checked);
                  clearError('presence');
                }}
                disabled={!gridRef.trim()}
                aria-describedby={errors.presence ? 'mission-presence-error' : undefined}
              />
              Only claimable from its grid square
            </label>
            {!gridRef.trim() ? <p className="text-xs text-[var(--muted-indigo)]">Add a grid ref to turn this on.</p> : null}
            {errors.presence ? <p id="mission-presence-error" className="text-xs font-semibold text-pink">{errors.presence}</p> : null}
          </div>
        </section>

        <section className="space-y-3 border-t border-indigo-brand/15 pt-3">
          <p className="section-kicker text-pink">When</p>
          <label className="block text-sm font-semibold text-indigo-brand" htmlFor="mission-expires-at">
            Expires <span className="font-normal text-[var(--muted-indigo)]">(optional)</span>
            <input
              id="mission-expires-at"
              className="mt-1 min-h-10 w-full rounded-xl border border-indigo-brand/20 bg-cream px-3 text-sm text-indigo-brand outline-none focus:border-pink focus:ring-2 focus:ring-pink/25"
              type="datetime-local"
              min={minimumExpiry}
              value={expiresAt}
              onChange={(event) => {
                setExpiresAt(event.target.value);
                clearError('expires');
              }}
              aria-invalid={Boolean(errors.expires)}
              aria-describedby={errors.expires ? 'mission-expires-at-error' : undefined}
            />
            {errors.expires ? <span id="mission-expires-at-error" className="mt-1 block text-xs font-semibold text-pink">{errors.expires}</span> : null}
          </label>
        </section>

        <section className="space-y-3 border-t border-indigo-brand/15 pt-3">
          <p className="section-kicker text-pink">How it completes</p>
          <label className="flex items-start gap-2 text-sm font-semibold text-indigo-brand">
            <input
              className="mt-0.5 size-4 accent-pink"
              type="checkbox"
              checked={requiresVerification}
              onChange={(event) => setRequiresVerification(event.target.checked)}
            />
            I want to confirm it&apos;s done
          </label>
        </section>

        <section className="space-y-2 border-t border-indigo-brand/15 pt-3">
          <p className="section-kicker text-pink">What it leads to</p>
          <label className="flex items-start gap-2 text-sm font-semibold text-indigo-brand">
            <input
              className="mt-0.5 size-4 accent-pink"
              type="checkbox"
              checked={hasReward}
              onChange={(event) => {
                setHasReward(event.target.checked);
                clearError('reward');
              }}
              aria-describedby={errors.reward ? 'mission-reward-error' : undefined}
            />
            Unlock something when enough people finish
          </label>

          {hasReward ? (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-indigo-brand" htmlFor="mission-reward-kind">
                What opens up?
                <select
                  id="mission-reward-kind"
                  className="mt-1 min-h-10 w-full rounded-xl border border-indigo-brand/20 bg-cream px-3 text-sm text-indigo-brand outline-none focus:border-pink focus:ring-2 focus:ring-pink/25"
                  value={rewardKind}
                  onChange={(event) => {
                    setRewardKind(event.target.value as RewardKind);
                    clearError('reward');
                  }}
                >
                  {REWARD_KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>{kind.label}</option>
                  ))}
                </select>
                <span className="mt-1 block text-xs font-normal text-[var(--muted-indigo)]">
                  {REWARD_KINDS.find((kind) => kind.value === rewardKind)?.description}
                </span>
              </label>

              <label className="block text-sm font-semibold text-indigo-brand" htmlFor="mission-reward-threshold">
                Unlock after this many finishers
                <input
                  id="mission-reward-threshold"
                  className="mt-1 min-h-10 w-full rounded-xl border border-indigo-brand/20 bg-cream px-3 text-sm text-indigo-brand outline-none focus:border-pink focus:ring-2 focus:ring-pink/25"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={rewardThreshold}
                  onChange={(event) => {
                    setRewardThreshold(event.target.value);
                    clearError('reward');
                  }}
                  aria-invalid={Boolean(errors.reward)}
                  aria-describedby={errors.reward ? 'mission-reward-error' : undefined}
                />
              </label>

              {rewardKind !== 'roster' ? (
                <label className="block text-sm font-semibold text-indigo-brand" htmlFor="mission-reward-body">
                  What unlocks
                  <textarea
                    id="mission-reward-body"
                    className="mt-1 min-h-24 w-full rounded-xl border border-indigo-brand/20 bg-cream px-3 py-2 text-sm leading-5 text-indigo-brand outline-none focus:border-pink focus:ring-2 focus:ring-pink/25"
                    value={rewardBody}
                    onChange={(event) => {
                      setRewardBody(event.target.value);
                      clearError('reward');
                    }}
                    aria-invalid={Boolean(errors.reward)}
                    aria-describedby={errors.reward ? 'mission-reward-error' : undefined}
                  />
                </label>
              ) : null}

              <label className="block text-sm font-semibold text-indigo-brand" htmlFor="mission-reward-closer-body">
                A little extra for the closer <span className="font-normal text-[var(--muted-indigo)]">(optional)</span>
                <textarea
                  id="mission-reward-closer-body"
                  className="mt-1 min-h-20 w-full rounded-xl border border-indigo-brand/20 bg-cream px-3 py-2 text-sm leading-5 text-indigo-brand outline-none focus:border-pink focus:ring-2 focus:ring-pink/25"
                  value={rewardCloserBody}
                  onChange={(event) => {
                    setRewardCloserBody(event.target.value);
                    clearError('reward');
                  }}
                />
              </label>
            </div>
          ) : null}

          {questLocked ? (
            <p className="text-xs text-[var(--muted-indigo)]">
              {questStep === 1 ? 'This starts a quest.' : `This is step ${questStep} of a quest.`}
            </p>
          ) : (
            <div className="space-y-2 border-t border-indigo-brand/15 pt-3">
              <label className="flex items-start gap-2 text-sm font-semibold text-indigo-brand">
                <input
                  className="mt-0.5 size-4 accent-pink"
                  type="checkbox"
                  checked={startsQuest}
                  onChange={(event) => {
                    const nextStartsQuest = event.target.checked;
                    setStartsQuest(nextStartsQuest);
                    setQuestId(nextStartsQuest ? crypto.randomUUID() : null);
                  }}
                />
                This starts a quest
              </label>

              {startsQuest ? (
                <fieldset className="space-y-1">
                  <legend className="text-sm font-semibold text-indigo-brand">What should people know?</legend>
                  <label className="flex items-start gap-2 text-sm text-indigo-brand">
                    <input
                      className="mt-0.5 size-4 accent-pink"
                      type="radio"
                      name="mission-quest-reveal"
                      value="hint"
                      checked={questReveal === 'hint'}
                      onChange={() => setQuestReveal('hint')}
                    />
                    Just hint that it continues
                  </label>
                  <label className="flex items-start gap-2 text-sm text-indigo-brand">
                    <input
                      className="mt-0.5 size-4 accent-pink"
                      type="radio"
                      name="mission-quest-reveal"
                      value="length"
                      checked={questReveal === 'length'}
                      onChange={() => setQuestReveal('length')}
                    />
                    Show how many steps
                  </label>
                  <p className="text-xs text-[var(--muted-indigo)]">Showing the length is clearer; hinting lets you extend the quest later without anyone noticing the number changed.</p>
                </fieldset>
              ) : null}
            </div>
          )}

          {!questLocked && capacityType === 'exclusive' && startsQuest ? (
            <p className="text-xs font-semibold text-pink">One person only means only that one person will ever see the rest of the chain.</p>
          ) : null}
          {requiresVerification && isQuestStep ? (
            <p className="text-xs font-semibold text-pink">The next step stays locked until you approve, so the chain stalls if you are away.</p>
          ) : null}

          {loadingRewardPayload ? <p className="text-xs text-[var(--muted-indigo)]">Loading what you promised…</p> : null}
          {errors.reward ? <p id="mission-reward-error" className="text-xs font-semibold text-pink">{errors.reward}</p> : null}
        </section>

        {errors.form ? <p className="text-xs font-semibold text-pink">{errors.form}</p> : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="submit"
            className="min-h-10 rounded-full bg-pink px-4 text-xs font-black text-cream transition-colors hover:bg-yellow hover:text-indigo-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35 disabled:opacity-50"
            disabled={saving || loadingRewardPayload || !rewardPayloadReady}
          >
            {saving ? 'Saving…' : mission ? 'Save mission' : 'Create mission'}
          </button>
          <button
            type="button"
            className="min-h-10 rounded-full border border-indigo-brand/20 px-4 text-xs font-black text-indigo-brand transition-colors hover:border-pink hover:text-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          {onDelete ? (
            <button
              type="button"
              className={`min-h-10 rounded-full px-4 text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35 disabled:opacity-50 ${
                deleteArmed
                  ? 'bg-pink text-cream hover:bg-yellow hover:text-indigo-brand'
                  : 'border border-pink/35 text-pink hover:bg-pink hover:text-cream'
              }`}
              onClick={() => void deleteMission()}
              disabled={saving}
            >
              {deleteArmed ? 'Tap again to delete' : 'Delete mission'}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
