import { describe, expect, it } from 'vitest';
import { claimErrorMessage, claimRequiresConnection, normaliseRows, validId, withClaims } from './missions';
import type { Claim, Mission } from './missions';

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: 'm1',
    creator_id: 'creator-1',
    title: 'Find the compass',
    description: '',
    capacity_type: 'open',
    capacity: null,
    grid_ref: null,
    requires_presence: false,
    verification_mode: 'none',
    submission_prompt: null,
    visibility: 'public',
    is_closed: false,
    expires_at: null,
    reward_kind: null,
    reward_threshold: null,
    quest_id: null,
    quest_step: null,
    quest_reveal: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'c1',
    mission_id: 'm1',
    claimer_id: 'user-1',
    state: 'claimed',
    claimed_at: '2026-01-01T00:00:00Z',
    done_at: null,
    released_at: null,
    submission_note: null,
    submitted_at: null,
    ...overrides
  };
}

describe('claimRequiresConnection', () => {
  it('open missions can be claimed offline', () => {
    expect(claimRequiresConnection('open')).toBe(false);
  });

  it('limited and exclusive missions require a live connection', () => {
    expect(claimRequiresConnection('limited')).toBe(true);
    expect(claimRequiresConnection('exclusive')).toBe(true);
  });
});

describe('validId', () => {
  it('rejects empty or whitespace-only ids', () => {
    expect(validId('')).toBe(false);
    expect(validId('   ')).toBe(false);
  });

  it('accepts a real id', () => {
    expect(validId('mission-123')).toBe(true);
  });
});

describe('withClaims — capacity accounting', () => {
  it('open missions have unlimited spots (spotsLeft is null)', () => {
    const row = { ...makeMission({ capacity_type: 'open', capacity: null }), mission_claims: [makeClaim()] };
    const withClaimsResult = withClaims(row, null);
    expect(withClaimsResult.spotsLeft).toBeNull();
    expect(withClaimsResult.activeClaimCount).toBe(1);
  });

  it('limited missions count only non-released claims against capacity', () => {
    const row = {
      ...makeMission({ capacity_type: 'limited', capacity: 3 }),
      mission_claims: [
        makeClaim({ id: 'c1', state: 'claimed' }),
        makeClaim({ id: 'c2', state: 'done' }),
        makeClaim({ id: 'c3', state: 'released' })
      ]
    };
    const result = withClaims(row, null);
    expect(result.activeClaimCount).toBe(2);
    expect(result.spotsLeft).toBe(1);
  });

  it('spotsLeft never goes negative when overclaimed', () => {
    const row = {
      ...makeMission({ capacity_type: 'exclusive', capacity: 1 }),
      mission_claims: [makeClaim({ id: 'c1' }), makeClaim({ id: 'c2' })]
    };
    const result = withClaims(row, null);
    expect(result.spotsLeft).toBe(0);
  });

  it('missing mission_claims defaults to an empty claim list', () => {
    const row = { ...makeMission({ capacity_type: 'limited', capacity: 2 }), mission_claims: null };
    const result = withClaims(row, null);
    expect(result.claims).toEqual([]);
    expect(result.activeClaimCount).toBe(0);
    expect(result.spotsLeft).toBe(2);
  });
});

describe('withClaims — myClaim', () => {
  it('finds the current user\'s active claim', () => {
    const row = {
      ...makeMission(),
      mission_claims: [makeClaim({ id: 'mine', claimer_id: 'user-1' }), makeClaim({ id: 'other', claimer_id: 'user-2' })]
    };
    const result = withClaims(row, 'user-1');
    expect(result.myClaim?.id).toBe('mine');
  });

  it('ignores a released claim by the current user', () => {
    const row = { ...makeMission(), mission_claims: [makeClaim({ claimer_id: 'user-1', state: 'released' })] };
    const result = withClaims(row, 'user-1');
    expect(result.myClaim).toBeNull();
  });

  it('returns null when there is no signed-in user', () => {
    const row = { ...makeMission(), mission_claims: [makeClaim({ claimer_id: 'user-1' })] };
    const result = withClaims(row, null);
    expect(result.myClaim).toBeNull();
  });
});

describe('normaliseRows', () => {
  it('extracts creator and claimer display names, strips the embeds', () => {
    const rows = [
      {
        ...makeMission({ creator_id: 'creator-1' }),
        creator: { display_name: '  Ada  ' },
        mission_claims: [
          {
            ...makeClaim({ claimer_id: 'claimer-1' }),
            claimer: { display_name: 'Grace' }
          }
        ]
      }
    ];

    const { rows: normalized, names } = normaliseRows(rows);
    expect(names).toEqual({ 'creator-1': 'Ada', 'claimer-1': 'Grace' });
    expect(normalized[0]).not.toHaveProperty('creator');
    expect(normalized[0].mission_claims?.[0]).not.toHaveProperty('claimer');
  });

  it('skips blank or missing display names', () => {
    const rows = [{ ...makeMission({ creator_id: 'creator-1' }), creator: { display_name: '   ' }, mission_claims: [] }];
    const { names } = normaliseRows(rows);
    expect(names).toEqual({});
  });

  it('passes through a non-array mission_claims value untouched', () => {
    const rows = [{ ...makeMission(), creator: null, mission_claims: null }];
    const { rows: normalized } = normaliseRows(rows);
    expect(normalized[0].mission_claims).toBeNull();
  });
});

describe('claimErrorMessage', () => {
  it('maps known Postgres/RPC error text to a friendly message', () => {
    expect(claimErrorMessage(new Error('Mission is already full'))).toMatch(/already full/);
    expect(claimErrorMessage(new Error('mission is closed for entries'))).toBe('This mission is closed.');
    expect(claimErrorMessage(new Error('this mission has expired'))).toBe('This mission has expired.');
  });

  it('passes through unrecognized errors unchanged', () => {
    expect(claimErrorMessage(new Error('network timeout'))).toBe('network timeout');
  });

  it('falls back for non-Error values', () => {
    expect(claimErrorMessage('nope')).toBe('Missions are unavailable right now.');
  });
});
