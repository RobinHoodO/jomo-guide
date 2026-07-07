import { useEffect, useMemo, useState } from 'react';
import { EventCard } from './EventCard';
import { type EventItem, getNow, pickSerendipity } from '../lib/events';

type SerendipityProps = {
  events: EventItem[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  onSelectGrid: (grid: string) => void;
  onSelectCamp: (campId: string) => void;
};

function DiceIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <circle cx="8.5" cy="8.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Serendipity({ events, isFavorite, toggleFavorite, onSelectGrid, onSelectCamp }: SerendipityProps) {
  const now = useMemo(() => getNow(), []);
  const [picked, setPicked] = useState<EventItem | null>(() => pickSerendipity(events, now));

  useEffect(() => {
    setPicked(pickSerendipity(events, now));
  }, [events, now]);

  return (
    <section className="space-y-2.5">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="section-kicker text-cream">Serendipity</p>
          <h2 className="display-heading mt-0.5 text-base">One good maybe</h2>
        </div>
        <button
          type="button"
          className="shuffle-button"
          onClick={() => setPicked(pickSerendipity(events, now))}
          disabled={!events.length}
          title="Roll with the filters you picked"
        >
          <DiceIcon />
          reshuffle
        </button>
      </div>
      {picked ? (
        <EventCard
          event={picked}
          isFavorite={isFavorite(picked.id)}
          isOccurrenceFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          onSelectGrid={onSelectGrid}
          onSelectCamp={onSelectCamp}
          compact
        />
      ) : (
        <p className="panel-card text-base text-[var(--muted-indigo)]">
          No dice with these filters. The void recommends loosening one.
        </p>
      )}
    </section>
  );
}
