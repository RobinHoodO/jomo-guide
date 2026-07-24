import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilterBar } from './FilterBar';
import { NowNext } from './NowNext';
import { Serendipity } from './Serendipity';
import { SwipeableEventCard } from './SwipeableEventCard';
import { useHidden } from '../hooks/useHidden';
import { EVENTS, filterEvents, getNow, groupByDay, type EventItem, type Filters } from '../lib/events';

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
  familyMode: false,
  showPast: false
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
  const { hiddenIds, isHidden, hide, unhide, unhideAll } = useHidden();
  const [undoHide, setUndoHide] = useState<{ id: string; title: string } | null>(null);
  const undoTimer = useRef<number | null>(null);

  // Re-evaluates the past-event rule when the app is brought back to the
  // foreground (PWAs resume with stale state at a festival). Uses the full
  // timestamp, not the date: events now expire at their end time, mid-day.
  const [nowKey, setNowKey] = useState(() => getNow().getTime());
  useEffect(() => {
    const refresh = () => setNowKey(getNow().getTime());
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  // Two layers so a swipe-hide only re-filters the small visible list,
  // not all 1,200+ events.
  const filtered = useMemo(() => filterEvents(EVENTS, filters), [filters, nowKey]);
  const visibleEvents = useMemo(() => filtered.filter((event) => !isHidden(event.id)), [filtered, isHidden]);
  const grouped = useMemo(() => groupByDay(visibleEvents), [visibleEvents]);

  useEffect(() => {
    return () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    };
  }, []);

  const hideEvent = useCallback(
    (event: EventItem) => {
      hide(event.id);
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
      setUndoHide({ id: event.id, title: event.title });
      undoTimer.current = window.setTimeout(() => {
        setUndoHide(null);
        undoTimer.current = null;
      }, 5000);
    },
    [hide]
  );

  const undoLastHide = () => {
    if (!undoHide) return;
    unhide(undoHide.id);
    setUndoHide(null);
    if (undoTimer.current !== null) {
      window.clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
  };

  const favoriteBySwipe = useCallback(
    (event: EventItem) => {
      if (!isFavorite(event.id)) toggleFavorite(event.id);
    },
    [isFavorite, toggleFavorite]
  );

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
          {hiddenIds.length ? (
            <button type="button" className="restore-hidden" onClick={unhideAll}>
              {hiddenIds.length} hidden · restore
            </button>
          ) : null}
        </div>

        {grouped.length ? (
          grouped.map((group) => (
            <section key={group.day} className="space-y-2 pt-1.5">
              <div className="day-pill">{group.day}</div>
              <div className="space-y-2">
                {group.events.map((event) => (
                  <SwipeableEventCard
                    key={event.id}
                    event={event}
                    isFavorite={isFavorite(event.id)}
                    isOccurrenceFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    onSelectGrid={onSelectGrid}
                    onSelectCamp={onSelectCamp}
                    onHide={hideEvent}
                    onSwipeFavorite={favoriteBySwipe}
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

      {undoHide ? (
        <div className="toast snackbar" role="status" aria-live="polite">
          <span>Hidden. Enjoy missing out 🙈</span>
          <button type="button" className="snackbar-undo" onClick={undoLastHide}>
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
