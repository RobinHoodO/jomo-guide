// Self-check for src/lib/past.ts — the "hide past events" rule.
// Run: node --experimental-strip-types scripts/check-past.mjs
import assert from 'node:assert';
import { isPastEvent, localISODate } from '../src/lib/past.ts';

const now = new Date('2026-07-20T12:00:00'); // mid-festival, local time

assert.equal(localISODate(now), '2026-07-20');

// Yesterday's event is past.
assert.equal(isPastEvent({ dayDate: '2026-07-19', endsAt: '2026-07-19T22:00:00' }, now), true);

// Today's event that already ended still shows (day-granular rule).
assert.equal(isPastEvent({ dayDate: '2026-07-20', endsAt: '2026-07-20T09:00:00' }, now), false);

// Today's in-progress and upcoming events show.
assert.equal(isPastEvent({ dayDate: '2026-07-20', endsAt: '2026-07-20T14:00:00' }, now), false);
assert.equal(isPastEvent({ dayDate: '2026-07-21', endsAt: '2026-07-21T02:00:00' }, now), false);

// Yesterday's party spilling past midnight into today is not past yet...
assert.equal(
  isPastEvent({ dayDate: '2026-07-19', endsAt: '2026-07-20T03:00:00' }, new Date('2026-07-20T01:00:00')),
  false
);
// ...but is past the following day.
assert.equal(
  isPastEvent({ dayDate: '2026-07-19', endsAt: '2026-07-20T03:00:00' }, new Date('2026-07-21T01:00:00')),
  true
);

// All-day / time-TBD events (no endsAt) fall back to the date comparison.
assert.equal(isPastEvent({ dayDate: '2026-07-19', endsAt: null }, now), true);
assert.equal(isPastEvent({ dayDate: '2026-07-20', endsAt: null }, now), false);

console.log('past-events self-check OK');
