import type { CapacityType, CreateMissionInput, MissionVisibility, QuestReveal, RewardKind, UpdateMissionInput, VerificationMode } from './missions';

export type NormalizedCreateInput = {
  title: string;
  description: string;
  capacity_type: CapacityType;
  capacity: number | null;
  grid_ref: string | null;
  visibility: MissionVisibility;
  expires_at: string | null;
  requires_presence: boolean;
  verification_mode: VerificationMode;
  submission_prompt: string | null;
  expected_answer: string | null;
  reward_kind: RewardKind | null;
  reward_threshold: number | null;
  reward_body: string | null;
  reward_closer_body: string | null;
  quest_id: string | null;
  quest_step: number | null;
  quest_reveal: QuestReveal | null;
};

export type Validation<T> = { data: T; error: null } | { data: null; error: string };

export function isCapacityType(value: unknown): value is CapacityType {
  return value === 'open' || value === 'limited' || value === 'exclusive';
}

export function isVisibility(value: unknown): value is MissionVisibility {
  return value === 'public' || value === 'hidden';
}

export function isRewardKind(value: unknown): value is RewardKind {
  return value === 'content' || value === 'clue' || value === 'roster' || value === 'handover';
}

export function isQuestReveal(value: unknown): value is QuestReveal {
  return value === 'hint' || value === 'length';
}

export function isVerificationMode(value: unknown): value is VerificationMode {
  return value === 'none' || value === 'note' || value === 'prompt' || value === 'answer';
}

export function validLimitedCapacity(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

export function validateTitle(title: unknown): Validation<string> {
  if (typeof title !== 'string') return { data: null, error: 'A mission title is required.' };

  const trimmed = title.trim();
  if (trimmed.length < 1 || trimmed.length > 140) {
    return { data: null, error: 'Mission titles must be between 1 and 140 characters.' };
  }

  return { data: trimmed, error: null };
}

export function validateDescription(description: unknown): Validation<string> {
  if (typeof description !== 'string') return { data: null, error: 'Mission descriptions must be text.' };
  if (description.length > 4000) return { data: null, error: 'Mission descriptions can be at most 4000 characters.' };

  return { data: description, error: null };
}

function normalizedGridRef(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() || null : null;
}

function validateBoolean(value: unknown, message: string): Validation<boolean> {
  if (typeof value !== 'boolean') return { data: null, error: message };
  return { data: value, error: null };
}

function normalizeText(value: unknown, message: string): Validation<string | null> {
  if (value === null || value === undefined) return { data: null, error: null };
  if (typeof value !== 'string') return { data: null, error: message };

  return { data: value.trim() || null, error: null };
}

export function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeVerification(
  modeValue: unknown,
  promptValue: unknown,
  answerValue: unknown
): Validation<Pick<NormalizedCreateInput, 'verification_mode' | 'submission_prompt' | 'expected_answer'>> {
  const verification_mode = modeValue ?? 'none';
  if (!isVerificationMode(verification_mode)) {
    return { data: null, error: 'Choose how this mission completes.' };
  }

  const prompt = normalizeText(promptValue, 'The question must be text.');
  if (prompt.error !== null) return { data: null, error: prompt.error };
  if ((verification_mode === 'prompt' || verification_mode === 'answer') && !prompt.data) {
    return { data: null, error: 'A question is required when people answer to finish.' };
  }

  const answer = normalizeText(answerValue, 'The expected answer must be text.');
  if (answer.error !== null) return { data: null, error: answer.error };
  if (verification_mode === 'answer' && !answer.data) {
    return { data: null, error: 'An expected answer is required when the app confirms it.' };
  }

  return {
    data: {
      verification_mode,
      submission_prompt: verification_mode === 'prompt' || verification_mode === 'answer' ? prompt.data : null,
      expected_answer: verification_mode === 'answer' && answer.data ? normalizeAnswer(answer.data) : null
    },
    error: null
  };
}

function validateExpiry(value: string | null | undefined, now: number): Validation<string | null> {
  if (value === null || value === undefined) return { data: null, error: null };
  if (typeof value !== 'string') return { data: null, error: 'That expiry date could not be read.' };

  const expiresAt = new Date(value).getTime();
  if (!Number.isFinite(expiresAt)) return { data: null, error: 'That expiry date could not be read.' };
  if (expiresAt <= now) return { data: null, error: 'An expiry has to be in the future.' };

  return { data: value, error: null };
}

type NormalizedReward = {
  reward_kind: RewardKind | null;
  reward_threshold: number | null;
  reward_body: string | null;
  reward_closer_body: string | null;
};

function normalizeReward(
  kindValue: unknown,
  thresholdValue: unknown,
  bodyValue: unknown,
  closerBodyValue: unknown
): Validation<NormalizedReward> {
  const reward_kind = kindValue ?? null;
  const reward_threshold = thresholdValue ?? null;

  if (reward_kind === null && reward_threshold === null) {
    return {
      data: { reward_kind: null, reward_threshold: null, reward_body: null, reward_closer_body: null },
      error: null
    };
  }

  if (!isRewardKind(reward_kind)) return { data: null, error: 'Choose what unlocks when they get there.' };
  if (typeof reward_threshold !== 'number' || !Number.isInteger(reward_threshold) || reward_threshold < 1) {
    return { data: null, error: 'A reward needs a whole number of finishers, at least 1.' };
  }

  const reward_body = typeof bodyValue === 'string' ? bodyValue.trim() : '';
  if (reward_kind !== 'roster' && !reward_body) {
    return { data: null, error: 'Say what unlocks when they get there.' };
  }
  if (closerBodyValue !== undefined && closerBodyValue !== null && typeof closerBodyValue !== 'string') {
    return { data: null, error: 'The closer’s extra needs to be text.' };
  }

  return {
    data: {
      reward_kind,
      reward_threshold,
      reward_body: reward_kind === 'roster' ? null : reward_body,
      reward_closer_body: typeof closerBodyValue === 'string' ? closerBodyValue.trim() || null : null
    },
    error: null
  };
}

type NormalizedQuest = {
  quest_id: string | null;
  quest_step: number | null;
  quest_reveal: QuestReveal | null;
};

function normalizeQuest(
  idValue: unknown,
  stepValue: unknown,
  revealValue: unknown
): Validation<NormalizedQuest> {
  const hasId = idValue !== null && idValue !== undefined;
  const hasStep = stepValue !== null && stepValue !== undefined;
  if (hasId !== hasStep) return { data: null, error: 'A quest needs both an id and a step.' };

  if (!hasId) {
    if (revealValue !== null && revealValue !== undefined) {
      return { data: null, error: 'Quest reveal is only available on the first step.' };
    }
    return { data: { quest_id: null, quest_step: null, quest_reveal: null }, error: null };
  }

  if (typeof idValue !== 'string' || !idValue.trim()) {
    return { data: null, error: 'A quest needs both an id and a step.' };
  }
  if (typeof stepValue !== 'number' || !Number.isInteger(stepValue) || stepValue < 1) {
    return { data: null, error: 'A quest step must be a whole number of at least 1.' };
  }

  const quest_reveal = revealValue ?? null;
  if (quest_reveal !== null && !isQuestReveal(quest_reveal)) {
    return { data: null, error: 'Choose how to reveal the quest.' };
  }
  if (quest_reveal !== null && stepValue !== 1) {
    return { data: null, error: 'Quest reveal is only available on the first step.' };
  }

  return {
    data: { quest_id: idValue.trim(), quest_step: stepValue, quest_reveal },
    error: null
  };
}

export function normalizeCreateInput(input: CreateMissionInput, now = Date.now()): Validation<NormalizedCreateInput> {
  const title = validateTitle(input.title);
  if (title.error !== null) return { data: null, error: title.error };

  const description = validateDescription(input.description ?? '');
  if (description.error !== null) return { data: null, error: description.error };

  if (!isCapacityType(input.capacity_type)) {
    return { data: null, error: 'Choose an open, limited, or exclusive capacity.' };
  }

  if (input.visibility !== undefined && !isVisibility(input.visibility)) {
    return { data: null, error: 'Mission visibility must be public or hidden.' };
  }

  const requiresPresence = input.requires_presence ?? false;
  const presence = validateBoolean(requiresPresence, 'Presence requirement must be true or false.');
  if (presence.error !== null) return { data: null, error: presence.error };

  const verification = normalizeVerification(input.verification_mode, input.submission_prompt, input.expected_answer);
  if (verification.error !== null) return { data: null, error: verification.error };

  let capacity: number | null;
  if (input.capacity_type === 'open') {
    if (input.capacity !== undefined && input.capacity !== null) {
      return { data: null, error: 'Open missions cannot have a capacity.' };
    }
    capacity = null;
  } else if (input.capacity_type === 'exclusive') {
    if (input.capacity !== undefined && input.capacity !== null && input.capacity !== 1) {
      return { data: null, error: 'Exclusive missions must have a capacity of 1.' };
    }
    capacity = 1;
  } else {
    if (!validLimitedCapacity(input.capacity)) {
      return { data: null, error: 'Limited missions need a whole-number capacity of at least 1.' };
    }
    capacity = input.capacity;
  }

  const grid_ref = normalizedGridRef(input.grid_ref);
  if (presence.data && !grid_ref) return { data: null, error: 'A here-only mission needs a grid square.' };

  const expiresAt = validateExpiry(input.expires_at, now);
  if (expiresAt.error !== null) return { data: null, error: expiresAt.error };

  const reward = normalizeReward(input.reward_kind, input.reward_threshold, input.reward_body, input.reward_closer_body);
  if (reward.error !== null) return { data: null, error: reward.error };

  const quest = normalizeQuest(input.quest_id, input.quest_step, input.quest_reveal);
  if (quest.error !== null) return { data: null, error: quest.error };

  return {
    data: {
      title: title.data,
      description: description.data,
      capacity_type: input.capacity_type,
      capacity,
      grid_ref,
      visibility: input.visibility ?? 'public',
      expires_at: expiresAt.data,
      requires_presence: presence.data,
      ...verification.data,
      ...reward.data,
      ...quest.data
    },
    error: null
  };
}

export function normalizeUpdateInput(input: UpdateMissionInput, now = Date.now()): Validation<UpdateMissionInput> {
  const patch: UpdateMissionInput = {};

  if ('title' in input) {
    const title = validateTitle(input.title);
    if (title.error !== null) return { data: null, error: title.error };
    patch.title = title.data;
  }

  if ('description' in input) {
    const description = validateDescription(input.description);
    if (description.error !== null) return { data: null, error: description.error };
    patch.description = description.data;
  }

  if ('visibility' in input) {
    if (!isVisibility(input.visibility)) return { data: null, error: 'Mission visibility must be public or hidden.' };
    patch.visibility = input.visibility;
  }

  if ('is_closed' in input) {
    if (typeof input.is_closed !== 'boolean') return { data: null, error: 'Closed status must be true or false.' };
    patch.is_closed = input.is_closed;
  }

  const grid_ref = 'grid_ref' in input ? normalizedGridRef(input.grid_ref) : undefined;
  if (grid_ref !== undefined) patch.grid_ref = grid_ref;
  if ('expires_at' in input) {
    const expiresAt = validateExpiry(input.expires_at, now);
    if (expiresAt.error !== null) return { data: null, error: expiresAt.error };
    patch.expires_at = expiresAt.data;
  }

  if ('requires_presence' in input) {
    const presence = validateBoolean(input.requires_presence, 'Presence requirement must be true or false.');
    if (presence.error !== null) return { data: null, error: presence.error };
    if (presence.data && !grid_ref) return { data: null, error: 'A here-only mission needs a grid square.' };
    patch.requires_presence = presence.data;
  }

  if ('verification_mode' in input) {
    const verification = normalizeVerification(input.verification_mode, input.submission_prompt, input.expected_answer);
    if (verification.error !== null) return { data: null, error: verification.error };
    Object.assign(patch, verification.data);
  } else {
    if ('submission_prompt' in input) {
      const prompt = normalizeText(input.submission_prompt, 'The question must be text.');
      if (prompt.error !== null) return { data: null, error: prompt.error };
      patch.submission_prompt = prompt.data;
    }

    if ('expected_answer' in input) {
      const answer = normalizeText(input.expected_answer, 'The expected answer must be text.');
      if (answer.error !== null) return { data: null, error: answer.error };
      patch.expected_answer = answer.data ? normalizeAnswer(answer.data) : null;
    }
  }

  if ('reward_kind' in input || 'reward_threshold' in input || 'reward_body' in input || 'reward_closer_body' in input) {
    const reward = normalizeReward(input.reward_kind, input.reward_threshold, input.reward_body, input.reward_closer_body);
    if (reward.error !== null) return { data: null, error: reward.error };
    Object.assign(patch, reward.data);
  }

  if ('quest_id' in input || 'quest_step' in input || 'quest_reveal' in input) {
    const quest = normalizeQuest(input.quest_id, input.quest_step, input.quest_reveal);
    if (quest.error !== null) return { data: null, error: quest.error };
    Object.assign(patch, quest.data);
  }

  if ('capacity_type' in input) {
    if (!isCapacityType(input.capacity_type)) {
      return { data: null, error: 'Choose an open, limited, or exclusive capacity.' };
    }

    patch.capacity_type = input.capacity_type;
    if (input.capacity_type === 'open') {
      if (input.capacity !== undefined && input.capacity !== null) {
        return { data: null, error: 'Open missions cannot have a capacity.' };
      }
      patch.capacity = null;
    } else if (input.capacity_type === 'exclusive') {
      if (input.capacity !== undefined && input.capacity !== null && input.capacity !== 1) {
        return { data: null, error: 'Exclusive missions must have a capacity of 1.' };
      }
      patch.capacity = 1;
    } else {
      if (!validLimitedCapacity(input.capacity)) {
        return { data: null, error: 'Limited missions need a whole-number capacity of at least 1.' };
      }
      patch.capacity = input.capacity;
    }
  } else if ('capacity' in input) {
    return { data: null, error: 'Choose a capacity type before changing capacity.' };
  }

  if (Object.keys(patch).length === 0) return { data: null, error: 'Choose at least one mission field to update.' };

  return { data: patch, error: null };
}

export function canClaimHere(
  mission: { requires_presence: boolean; grid_ref: string | null },
  currentCell: string | null,
  canonicalize: (code: string) => string | null
): boolean {
  if (!mission.requires_presence) return true;
  if (!mission.grid_ref || !currentCell) return false;

  const missionCell = canonicalize(mission.grid_ref);
  return missionCell !== null && missionCell === canonicalize(currentCell);
}

export function canDeleteQuestStep(
  mission: { quest_id: string | null; quest_step: number | null },
  missions: Array<{ quest_id: string | null; quest_step: number | null }>
): boolean {
  if (!mission.quest_id || mission.quest_step === null) return true;

  return !missions.some(
    (candidate) =>
      candidate.quest_id === mission.quest_id &&
      candidate.quest_step !== null &&
      candidate.quest_step > mission.quest_step!
  );
}

export function questLabel({
  step,
  steps,
  questName
}: {
  step: number;
  steps: number | null | undefined;
  questName: string | null | undefined;
}): string {
  if (step === 1) {
    return typeof steps === 'number'
      ? `a quest · ${steps} step${steps === 1 ? '' : 's'}`
      : 'a quest · this leads somewhere';
  }

  const name = questName?.trim() || 'a quest';
  return typeof steps === 'number'
    ? `${name} · step ${step} of ${steps}`
    : `${name} · step ${step}`;
}
