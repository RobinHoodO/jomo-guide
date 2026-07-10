import { useState } from 'react';
import { EventCard } from './EventCard';
import { type EventItem, getNow, isHappeningNow, isStartingSoon } from '../lib/events';

const STORAGE_KEY = 'jomo:nownext-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

type NowNextProps = {
  events: EventItem[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  onSelectGrid: (grid: string) => void;
  onSelectCamp: (campId: string) => void;
};

export function NowNext({ events, isFavorite, toggleFavorite, onSelectGrid, onSelectCamp }: NowNextProps) {
  const now = getNow();
  const happening = events.filter((event) => isHappeningNow(event, now)).slice(0, 4);
  const soon = events
    .filter((event) => isStartingSoon(event, now, 3))
    .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)))
    .slice(0, 4);

  const [collapsed, setCollapsed] = useState(readCollapsed);
  const total = happening.length + soon.length;
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* storage unavailable — keep in-memory state */
      }
      return next;
    });
  };

  return (
    <section className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="section-kicker text-cream">Now / Next</p>
          <h2 className="display-heading mt-0.5 text-base">The current little river</h2>
        </div>
        <button type="button" className="shuffle-button" onClick={toggleCollapsed} aria-expanded={!collapsed}>
          {collapsed ? `Show${total ? ` (${total})` : ''}` : 'Hide'}
        </button>
      </div>
      <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${collapsed ? 'hidden' : ''}`}>
        <NowNextColumn
          title="Happening now"
          events={happening}
          empty="The now is oddly spacious."
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          onSelectGrid={onSelectGrid}
          onSelectCamp={onSelectCamp}
        />
        <NowNextColumn
          title="Starting soon"
          events={soon}
          empty="Soon is taking a breather."
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          onSelectGrid={onSelectGrid}
          onSelectCamp={onSelectCamp}
        />
      </div>
    </section>
  );
}

function NowNextColumn({
  title,
  events,
  empty,
  isFavorite,
  toggleFavorite,
  onSelectGrid,
  onSelectCamp
}: {
  title: string;
  events: EventItem[];
  empty: string;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  onSelectGrid: (grid: string) => void;
  onSelectCamp: (campId: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <h3 className="text-[11px] font-black text-yellow">{title}</h3>
      {events.length ? (
        <div className="space-y-2">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isFavorite={isFavorite(event.id)}
              isOccurrenceFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              onSelectGrid={onSelectGrid}
              onSelectCamp={onSelectCamp}
              compact
            />
          ))}
        </div>
      ) : (
        <p className="panel-card text-sm text-[var(--muted-indigo)]">{empty}</p>
      )}
    </div>
  );
}
