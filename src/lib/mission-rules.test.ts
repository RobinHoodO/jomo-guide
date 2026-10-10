import { describe, expect, it } from 'vitest';
import {
  canClaimHere,
  canDeleteQuestStep,
  isCapacityType,
  isQuestReveal,
  isRewardKind,
  isVerificationMode,
  isVisibility,
  normalizeAnswer,
  normalizeCreateInput,
  normalizeUpdateInput,
  questLabel,
  validateDescription,
  validateTitle,
  validLimitedCapacity
} from './mission-rules';
import type { CreateMissionInput } from './missions';

const baseInput: CreateMissionInput = {
  title: 'Find the compass',
  capacity_type: 'open'
};

describe('type guards', () => {
  it('isCapacityType accepts only the three known values', () => {
    expect(isCapacityType('open')).toBe(true);
    expect(isCapacityType('limited')).toBe(true);
    expect(isCapacityType('exclusive')).toBe(true);
    expect(isCapacityType('unlimited')).toBe(false);
    expect(isCapacityType(undefined)).toBe(false);
  });

  it('isVisibility, isRewardKind, isQuestReveal, isVerificationMode reject junk', () => {
    expect(isVisibility('public')).toBe(true);
    expect(isVisibility('secret')).toBe(false);
    expect(isRewardKind('roster')).toBe(true);
    expect(isRewardKind('gold')).toBe(false);
    expect(isQuestReveal('hint')).toBe(true);
    expect(isQuestReveal('spoiler')).toBe(false);
    expect(isVerificationMode('answer')).toBe(true);
    expect(isVerificationMode('vibes')).toBe(false);
  });

  it('validLimitedCapacity requires a positive integer', () => {
    expect(validLimitedCapacity(1)).toBe(true);
    expect(validLimitedCapacity(0)).toBe(false);
    expect(validLimitedCapacity(-1)).toBe(false);
    expect(validLimitedCapacity(1.5)).toBe(false);
    expect(validLimitedCapacity('1')).toBe(false);
  });
});

describe('validateTitle / validateDescription', () => {
  it('rejects empty or non-string titles', () => {
    expect(validateTitle('').error).toBeTruthy();
    expect(validateTitle('   ').error).toBeTruthy();
    expect(validateTitle(42).error).toBeTruthy();
  });

  it('trims and accepts a valid title', () => {
    expect(validateTitle('  Find the door  ')).toEqual({ data: 'Find the door', error: null });
  });

  it('rejects titles over 140 characters', () => {
    expect(validateTitle('a'.repeat(141)).error).toBeTruthy();
    expect(validateTitle('a'.repeat(140)).error).toBeNull();
  });

  it('rejects descriptions over 4000 characters', () => {
    expect(validateDescription('a'.repeat(4001)).error).toBeTruthy();
    expect(validateDescription('a'.repeat(4000)).error).toBeNull();
  });
});

describe('normalizeAnswer', () => {
  it('lowercases, trims, and collapses internal whitespace', () => {
    expect(normalizeAnswer('  The   Answer  ')).toBe('the answer');
  });
});

describe('normalizeCreateInput — capacity', () => {
  it('open missions cannot carry a capacity', () => {
    const result = normalizeCreateInput({ ...baseInput, capacity_type: 'open', capacity: 5 });
    expect(result.error).toMatch(/cannot have a capacity/);
  });

  it('exclusive missions force capacity to 1, and reject any other explicit value', () => {
    const ok = normalizeCreateInput({ ...baseInput, capacity_type: 'exclusive' });
    expect(ok.data?.capacity).toBe(1);

    const okExplicit = normalizeCreateInput({ ...baseInput, capacity_type: 'exclusive', capacity: 1 });
    expect(okExplicit.error).toBeNull();

    const bad = normalizeCreateInput({ ...baseInput, capacity_type: 'exclusive', capacity: 2 });
    expect(bad.error).toMatch(/must have a capacity of 1/);
  });

  it('limited missions require a positive integer capacity', () => {
    const missing = normalizeCreateInput({ ...baseInput, capacity_type: 'limited' });
    expect(missing.error).toMatch(/need a whole-number capacity/);

    const zero = normalizeCreateInput({ ...baseInput, capacity_type: 'limited', capacity: 0 });
    expect(zero.error).toBeTruthy();

    const ok = normalizeCreateInput({ ...baseInput, capacity_type: 'limited', capacity: 3 });
    expect(ok.data?.capacity).toBe(3);
  });
});

describe('normalizeCreateInput — presence + grid ref', () => {
  it('requires a grid square when presence is required', () => {
    const result = normalizeCreateInput({ ...baseInput, requires_presence: true });
    expect(result.error).toMatch(/needs a grid square/);
  });

  it('accepts presence with a grid ref, trimming it', () => {
    const result = normalizeCreateInput({ ...baseInput, requires_presence: true, grid_ref: '  B7  ' });
    expect(result.error).toBeNull();
    expect(result.data?.grid_ref).toBe('B7');
  });
});

describe('normalizeCreateInput — verification', () => {
  it('defaults to "none" and no prompt/answer', () => {
    const result = normalizeCreateInput(baseInput);
    expect(result.data?.verification_mode).toBe('none');
    expect(result.data?.submission_prompt).toBeNull();
    expect(result.data?.expected_answer).toBeNull();
  });

  it('prompt mode requires a question', () => {
    const result = normalizeCreateInput({ ...baseInput, verification_mode: 'prompt' });
    expect(result.error).toMatch(/question is required/);
  });

  it('answer mode requires both a question and an expected answer, and normalizes the answer', () => {
    const noAnswer = normalizeCreateInput({
      ...baseInput,
      verification_mode: 'answer',
      submission_prompt: 'What number?'
    });
    expect(noAnswer.error).toMatch(/expected answer is required/);

    const ok = normalizeCreateInput({
      ...baseInput,
      verification_mode: 'answer',
      submission_prompt: 'What number?',
      expected_answer: '  Forty Two  '
    });
    expect(ok.error).toBeNull();
    expect(ok.data?.expected_answer).toBe('forty two');
  });
});

describe('normalizeCreateInput — expiry', () => {
  it('rejects an expiry in the past', () => {
    const now = Date.parse('2026-01-15T12:00:00Z');
    const result = normalizeCreateInput({ ...baseInput, expires_at: '2026-01-01T00:00:00Z' }, now);
    expect(result.error).toMatch(/has to be in the future/);
  });

  it('accepts an expiry in the future', () => {
    const now = Date.parse('2026-01-15T12:00:00Z');
    const result = normalizeCreateInput({ ...baseInput, expires_at: '2026-02-01T00:00:00Z' }, now);
    expect(result.error).toBeNull();
  });

  it('rejects an unparseable expiry', () => {
    const result = normalizeCreateInput({ ...baseInput, expires_at: 'not-a-date' });
    expect(result.error).toMatch(/could not be read/);
  });
});

describe('normalizeCreateInput — reward', () => {
  it('allows omitting the reward entirely', () => {
    const result = normalizeCreateInput(baseInput);
    expect(result.data?.reward_kind).toBeNull();
  });

  it('requires a reward_body for non-roster rewards', () => {
    const result = normalizeCreateInput({ ...baseInput, reward_kind: 'clue', reward_threshold: 1 });
    expect(result.error).toMatch(/Say what unlocks/);
  });

  it('roster rewards do not need a body', () => {
    const result = normalizeCreateInput({ ...baseInput, reward_kind: 'roster', reward_threshold: 1 });
    expect(result.error).toBeNull();
    expect(result.data?.reward_body).toBeNull();
  });

  it('rejects a non-integer or zero threshold', () => {
    const result = normalizeCreateInput({
      ...baseInput,
      reward_kind: 'clue',
      reward_threshold: 0,
      reward_body: 'A map fragment.'
    });
    expect(result.error).toBeTruthy();
  });
});

describe('normalizeCreateInput — quest chaining', () => {
  it('requires both quest_id and quest_step together', () => {
    const idOnly = normalizeCreateInput({ ...baseInput, quest_id: 'q1' });
    expect(idOnly.error).toMatch(/needs both an id and a step/);

    const stepOnly = normalizeCreateInput({ ...baseInput, quest_step: 1 });
    expect(stepOnly.error).toMatch(/needs both an id and a step/);
  });

  it('quest_reveal is only allowed on step 1', () => {
    const result = normalizeCreateInput({ ...baseInput, quest_id: 'q1', quest_step: 2, quest_reveal: 'hint' });
    expect(result.error).toMatch(/only available on the first step/);
  });

  it('accepts a valid first step with a reveal', () => {
    const result = normalizeCreateInput({ ...baseInput, quest_id: 'q1', quest_step: 1, quest_reveal: 'length' });
    expect(result.error).toBeNull();
    expect(result.data?.quest_id).toBe('q1');
  });

  it('rejects quest_reveal with no quest at all', () => {
    const result = normalizeCreateInput({ ...baseInput, quest_reveal: 'hint' });
    expect(result.error).toMatch(/only available on the first step/);
  });
});

describe('normalizeUpdateInput', () => {
  it('rejects an empty patch', () => {
    expect(normalizeUpdateInput({}).error).toMatch(/at least one mission field/);
  });

  it('only touches fields present in the patch', () => {
    const result = normalizeUpdateInput({ title: 'New title' });
    expect(result.data).toEqual({ title: 'New title' });
  });

  it('requires a capacity_type before accepting a bare capacity change', () => {
    const result = normalizeUpdateInput({ capacity: 5 });
    expect(result.error).toMatch(/before changing capacity/);
  });

  it('switching to exclusive forces capacity to 1', () => {
    const result = normalizeUpdateInput({ capacity_type: 'exclusive' });
    expect(result.data?.capacity).toBe(1);
  });
});

describe('canClaimHere', () => {
  const canonicalize = (code: string) => code.trim().toUpperCase() || null;

  it('missions without a presence requirement can always be claimed', () => {
    expect(canClaimHere({ requires_presence: false, grid_ref: null }, null, canonicalize)).toBe(true);
  });

  it('requires a current cell that matches the mission grid ref', () => {
    const mission = { requires_presence: true, grid_ref: 'b7' };
    expect(canClaimHere(mission, null, canonicalize)).toBe(false);
    expect(canClaimHere(mission, 'c4', canonicalize)).toBe(false);
    expect(canClaimHere(mission, 'B7', canonicalize)).toBe(true);
  });
});

describe('canDeleteQuestStep', () => {
  it('non-quest missions can always be deleted', () => {
    expect(canDeleteQuestStep({ quest_id: null, quest_step: null }, [])).toBe(true);
  });

  it('blocks deleting a step that has a later step depending on it', () => {
    const mission = { quest_id: 'q1', quest_step: 1 };
    const missions = [mission, { quest_id: 'q1', quest_step: 2 }];
    expect(canDeleteQuestStep(mission, missions)).toBe(false);
  });

  it('allows deleting the last step in a quest', () => {
    const mission = { quest_id: 'q1', quest_step: 2 };
    const missions = [{ quest_id: 'q1', quest_step: 1 }, mission];
    expect(canDeleteQuestStep(mission, missions)).toBe(true);
  });
});

describe('questLabel', () => {
  it('labels step 1 with the total step count when known', () => {
    expect(questLabel({ step: 1, steps: 3, questName: null })).toBe('a quest · 3 steps');
    expect(questLabel({ step: 1, steps: 1, questName: null })).toBe('a quest · 1 step');
  });

  it('labels step 1 without a known total', () => {
    expect(questLabel({ step: 1, steps: null, questName: null })).toBe('a quest · this leads somewhere');
  });

  it('labels later steps with the quest name when present', () => {
    expect(questLabel({ step: 2, steps: 3, questName: 'The Signal' })).toBe('The Signal · step 2 of 3');
  });

  it('falls back to "a quest" when no name is set', () => {
    expect(questLabel({ step: 2, steps: undefined, questName: '  ' })).toBe('a quest · step 2');
  });
});
