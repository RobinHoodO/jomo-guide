// Which events count as "already over" relative to now. Event-granular:
// an event hides once its own end time has passed, so finished events drop
// off the list even on the current day, while in-progress and upcoming ones
// (including yesterday's parties spilling past midnight) stay visible.
// All-day / time-TBD events have no trustworthy end time, so they fall back
// to day-granular: hidden only once their whole day is behind the local date.
// Pure module (no window, no data imports) so scripts/check-past.mjs can run it in node.

export type PastCheckable = { dayDate: string; endsAt: string | null; timeTBD?: boolean };

export function localISODate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isPastEvent(event: PastCheckable, now: Date) {
  if (event.endsAt && !event.timeTBD) {
    return new Date(event.endsAt).getTime() < now.getTime();
  }
  return event.dayDate < localISODate(now);
}
