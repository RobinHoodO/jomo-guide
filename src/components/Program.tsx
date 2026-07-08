import { useMemo, useState } from 'react';
import { EventCard } from './EventCard';
import { FilterBar } from './FilterBar';
import { NowNext } from './NowNext';
import { Serendipity } from './Serendipity';
import { EVENTS, filterEvents, groupByDay, type Filters } from '../lib/events';

type ProgramProps = {
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  onSelectGrid: (grid: string) => void;
  onSelectCamp: (campId: string) => void;
};

const EMPTY_FILTERS: Filters = {
  query: '',
  day: null,
  hourFrom: null,
  hourTo: null,
  categories: [],
  flags: [],
  familyMode: false
};

function Sparkle({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={`sparkle ${className}`} viewBox="0 0 20 20">
      <path d="M10 1.5 12.3 7.7 18.5 10 12.3 12.3 10 18.5 7.7 12.3 1.5 10 7.7 7.7 10 1.5Z" />
    </svg>
  );
}

export function Program({ isFavorite, toggleFavorite, onSelectGrid, onSelectCamp }: ProgramProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const visibleEvents = useMemo(() => filterEvents(EVENTS, filters), [filters]);
  const grouped = useMemo(() => groupByDay(visibleEvents), [visibleEvents]);

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} setFilters={setFilters} />
      <Serendipity
        events={visibleEvents}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
        onSelectGrid={onSelectGrid}
        onSelectCamp={onSelectCamp}
      />
      <NowNext
        events={visibleEvents}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
        onSelectGrid={onSelectGrid}
        onSelectCamp={onSelectCamp}
      />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="section-kicker text-cream">Program</p>
            <div className="flex items-center gap-1.5">
              <h2 className="display-heading mt-0.5 text-base">{visibleEvents.length} invitations</h2>
              <Sparkle className="text-pink" />
            </div>
          </div>
        </div>

        {grouped.length ? (
          grouped.map((group) => (
            <section key={group.day} className="space-y-2 pt-1.5">
              <div className="day-pill">{group.day}</div>
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
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <p className="panel-card text-base text-[var(--muted-indigo)]">
            Nothing matches. Missing out has become extremely literal.
          </p>
        )}
      </section>
    </div>
  );
}
