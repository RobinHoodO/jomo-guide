// Which events count as "already over" relative to now. Day-granular:
// an event hides only once its whole day is behind the current local date,
// so anything happening today (even if it started hours ago) still shows.
// Events spilling past midnight stay visible until their own end time passes.
// Pure module (no window, no data imports) so scripts/check-past.mjs can run it in node.

export type PastCheckable = { dayDate: string; endsAt: string | null };

export function localISODate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isPastEvent(event: PastCheckable, now: Date) {
  if (event.endsAt) {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(event.endsAt).getTime() < startOfToday.getTime();
  }
  return event.dayDate < localISODate(now);
}
