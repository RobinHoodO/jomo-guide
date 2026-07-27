import { formatTime, getNow, type EventItem } from '../lib/events';
import { localISODate } from '../lib/past';

type TodayStripProps = {
  events: EventItem[];
  isFavorite: (id: string) => boolean;
};

function scrollToEvent(id: string) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-event-id]'));
  const card = cards.find((item) => item.dataset.eventId === id && item.closest('.swipe-wrap'));
  card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function TodayStrip({ events, isFavorite }: TodayStripProps) {
  const now = getNow();
  const remaining = events
    .filter(
      (event) =>
        event.dayDate === localISODate(now) &&
        event.startsAt &&
        new Date(event.startsAt).getTime() > now.getTime()
    )
    .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
  const starred = remaining.filter((event) => isFavorite(event.id));
  const nextStarred = starred[0];

  if (!remaining.length) return null;

  return (
    <section className="space-y-1.5">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5">
        <div>
          <p className="section-kicker text-cream">Today</p>
          <h2 className="display-heading mt-0.5 text-base">Rest of today</h2>
        </div>
        <p className="pb-0.5 text-xs font-black text-cream/80">
          {remaining.length} still to come · {starred.length} starred
        </p>
        {nextStarred ? (
          <button
            type="button"
            className="flex min-h-10 min-w-0 max-w-full items-center gap-1.5 rounded-full bg-cream/12 px-3 text-left text-xs font-black text-cream transition-colors duration-200 hover:bg-cream/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35"
            onClick={() => scrollToEvent(nextStarred.id)}
            title={`Find ${nextStarred.title} in the program`}
          >
            <span className="shrink-0 text-yellow">Next star</span>
            <span className="truncate">{nextStarred.title}</span>
            <span className="shrink-0 text-cream/75">{formatTime(nextStarred)}</span>
          </button>
        ) : (
          <p className="pb-0.5 text-xs font-semibold text-cream/75">Star something to make a little plan.</p>
        )}
      </div>
    </section>
  );
}
