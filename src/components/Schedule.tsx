import { EventCard } from './EventCard';
import {
  EVENTS,
  dayIsLight,
  groupByDay,
  hasOverlap,
  type EventItem
} from '../lib/events';

type ScheduleProps = {
  favoriteIds: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  onSelectGrid: (grid: string) => void;
  onSelectCamp: (campId: string) => void;
};

export function Schedule({ favoriteIds, isFavorite, toggleFavorite, onSelectGrid, onSelectCamp }: ScheduleProps) {
  const favoriteEvents = favoriteIds
    .map((id) => EVENTS.find((event) => event.id === id))
    .filter((event): event is EventItem => Boolean(event))
    .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
  const missingIds = favoriteIds.filter((id) => !EVENTS.some((event) => event.id === id));
  const grouped = groupByDay(favoriteEvents);

  return (
    <div className="space-y-6">
      <section>
        <p className="section-kicker text-cream">My Schedule</p>
        <h2 className="display-heading mt-0.5 text-lg">The chosen few</h2>
        <p className="mt-1 max-w-xl text-sm leading-5 text-cream">
          A star is a maybe with dignity. Change your mind whenever the dust says so.
        </p>
      </section>

      {favoriteEvents.length || missingIds.length ? (
        <div className="space-y-5">
          {grouped.map((group) => {
            const hasConflict = group.events.some((event, index) =>
              group.events.slice(index + 1).some((other) => hasOverlap(event, other))
            );

            return (
              <section key={group.day} className="space-y-2 pt-1.5">
                <div className="day-pill">{group.day}</div>
                {dayIsLight(group.events) ? <p className="jomo-line">A spacious day 🌾</p> : null}
                {hasConflict ? <p className="jomo-line">Times overlap: pick one, skip the rest.</p> : null}
                <div className="space-y-2">
                  {group.events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isFavorite={isFavorite(event.id)}
                      isOccurrenceFavorite={isFavorite}
                      onToggleFavorite={toggleFavorite}
                      onSelectGrid={onSelectGrid}
                      onSelectCamp={onSelectCamp}
                      note={
                        group.events.some((other) => hasOverlap(event, other))
                          ? 'This one shares a window with another favorite.'
                          : undefined
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {missingIds.map((id) => (
            <article key={id} className="event-card opacity-55">
              <h3 className="text-sm font-semibold text-indigo-brand">Saved event removed from program</h3>
              <p className="mt-1 text-sm text-[var(--muted-indigo)]">
                This starred id no longer exists in the baked program: {id}
              </p>
              <button
                type="button"
                className="mt-2 min-h-10 rounded-md text-xs font-black text-pink transition-colors duration-200 hover:text-indigo-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35"
                onClick={() => toggleFavorite(id)}
              >
                let it go
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="panel-card text-base text-[var(--muted-indigo)]">
          No stars yet. Your future self currently has excellent boundaries.
        </p>
      )}
    </div>
  );
}
