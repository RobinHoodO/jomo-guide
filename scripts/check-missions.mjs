// Self-check for src/lib/mission-rules.ts.
// Run: node --experimental-strip-types scripts/check-missions.mjs
import assert from 'node:assert';
import { canClaimHere, normalizeCreateInput, normalizeUpdateInput } from '../src/lib/mission-rules.ts';

const canonicalize = (code) => {
  const match = /^([A-Z]+)0*(\d+)$/.exec(code.trim().toUpperCase());
  if (!match) return null;

  const row = Number(match[2]);
  return Number.isFinite(row) && row >= 1 ? `${match[1]}${row}` : null;
};

const baseInput = {
  title: 'Bring a good story',
  capacity_type: 'exclusive'
};
const now = Date.parse('2026-07-27T17:15:58Z');

const exclusive = normalizeCreateInput({ ...baseInput, capacity: null });
assert.equal(exclusive.error, null);
assert.equal(exclusive.data?.capacity, 1);

assert.notEqual(normalizeCreateInput({ ...baseInput, capacity: 3 }).error, null);
assert.notEqual(normalizeCreateInput({ ...baseInput, capacity_type: 'limited', capacity: 0 }).error, null);
assert.notEqual(normalizeCreateInput({ ...baseInput, capacity_type: 'limited', capacity: '' }).error, null);
assert.notEqual(normalizeCreateInput({ ...baseInput, capacity_type: 'open', capacity: 2 }).error, null);
assert.notEqual(normalizeCreateInput({ ...baseInput, title: '   ' }).error, null);
assert.notEqual(
  normalizeCreateInput({ ...baseInput, requires_presence: true, grid_ref: null }).error,
  null
);
assert.equal(
  normalizeCreateInput({ ...baseInput, expires_at: '2026-07-27T17:15:00Z' }, now).error,
  'An expiry has to be in the future.'
);
assert.equal(normalizeCreateInput({ ...baseInput, expires_at: '2026-07-27T17:16:00Z' }, now).error, null);
assert.equal(normalizeCreateInput({ ...baseInput, expires_at: null }, now).error, null);
assert.equal(
  normalizeCreateInput({ ...baseInput, expires_at: 'not-a-date' }, now).error,
  'That expiry date could not be read.'
);
assert.equal(normalizeUpdateInput({ expires_at: '2026-07-27T17:15:00Z' }, now).error, 'An expiry has to be in the future.');
assert.equal(normalizeUpdateInput({ expires_at: '2026-07-27T17:16:00Z' }, now).error, null);
assert.equal(normalizeUpdateInput({ expires_at: null }, now).error, null);
assert.equal(normalizeUpdateInput({ expires_at: 'not-a-date' }, now).error, 'That expiry date could not be read.');
assert.equal(
  normalizeCreateInput({ ...baseInput, reward_kind: 'content', reward_threshold: 1, reward_body: 'Meet by the fountain.' }).error,
  null
);
assert.equal(
  normalizeCreateInput({ ...baseInput, reward_kind: 'content', reward_threshold: 1.5, reward_body: 'Meet by the fountain.' }).error,
  'A reward needs a whole number of finishers, at least 1.'
);
assert.equal(
  normalizeCreateInput({ ...baseInput, reward_kind: 'content', reward_threshold: 0, reward_body: 'Meet by the fountain.' }).error,
  'A reward needs a whole number of finishers, at least 1.'
);
assert.equal(
  normalizeCreateInput({ ...baseInput, reward_kind: 'content', reward_threshold: 3, reward_body: '   ' }).error,
  'Say what unlocks when they get there.'
);
assert.equal(
  normalizeCreateInput({ ...baseInput, reward_kind: 'roster', reward_threshold: 3 }).error,
  null
);
assert.equal(
  normalizeUpdateInput({ reward_kind: 'clue', reward_threshold: 2, reward_body: 'Look for the yellow flag.' }).error,
  null
);

assert.equal(canClaimHere({ requires_presence: true, grid_ref: 'B03' }, 'b3', canonicalize), true);
assert.equal(canClaimHere({ requires_presence: true, grid_ref: 'B3' }, 'B4', canonicalize), false);
assert.equal(canClaimHere({ requires_presence: true, grid_ref: 'B3' }, null, canonicalize), false);
assert.equal(canClaimHere({ requires_presence: false, grid_ref: null }, null, canonicalize), true);

console.log('missions self-check OK');
