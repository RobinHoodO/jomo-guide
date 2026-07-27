// Self-check for src/lib/mission-rules.ts.
// Run: node --experimental-strip-types scripts/check-missions.mjs
import assert from 'node:assert';
import { canClaimHere, normalizeCreateInput } from '../src/lib/mission-rules.ts';

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

assert.equal(canClaimHere({ requires_presence: true, grid_ref: 'B03' }, 'b3', canonicalize), true);
assert.equal(canClaimHere({ requires_presence: true, grid_ref: 'B3' }, 'B4', canonicalize), false);
assert.equal(canClaimHere({ requires_presence: true, grid_ref: 'B3' }, null, canonicalize), false);
assert.equal(canClaimHere({ requires_presence: false, grid_ref: null }, null, canonicalize), true);

console.log('missions self-check OK');
