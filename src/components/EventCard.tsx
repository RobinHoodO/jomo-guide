import { useState } from 'react';
import { FLAG_FILTERS, WARNING_FLAGS, type EventItem, formatTime, getRecurringSiblings } from '../lib/events';

type EventCardProps = {
  event: EventItem;
  isFavorite: boolean;
  isOccurrenceFavorite?: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onSelectGrid?: (grid: string) => void;
  compact?: boolean;
  muted?: boolean;
  note?: string;
};

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.25 14.75 8.82l6.15.9-4.45 4.34 1.05 6.12L12 17.29l-5.5 2.89 1.05-6.12L3.1 9.72l6.15-.9L12 3.25Z" />
    </svg>
  );
}

function RecurringIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 15.5-6.2" />
      <path d="M18.5 3.5V8h-4.5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.2" />
      <path d="M5.5 20.5V16H10" />
    </svg>
  );
}

function formatSiblingDay(event: EventItem) {
  const dayName = event.day.split(' ')[0]?.replace('.', '') || event.day;
  const dayNumber = Number(event.dayDate.slice(-2));
  return `${dayName} ${Number.isFinite(dayNumber) ? dayNumber : event.dayDate}`;
}

export function EventCard({
  event,
  isFavorite,
  isOccurrenceFavorite,
  onToggleFavorite,
  onSelectGrid,
  compact = false,
  muted = false,
  note
}: EventCardProps) {
  const visibleFlags = FLAG_FILTERS.filter(({ key }) => event.flags[key]);
  const warnings = visibleFlags.filter(({ key }) => WARNING_FLAGS.includes(key));
  const softFlags = visibleFlags.filter(({ key }) => !WARNING_FLAGS.includes(key));
  const recurringSiblings = getRecurringSiblings(event);
  const [isExpanded, setIsExpanded] = useState(false);
  const siblingFavorite = isOccurrenceFavorite || ((id: string) => id === event.id && isFavorite);

  return (
    <article className={`event-card ${muted ? 'opacity-55 grayscale' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[10px] leading-4 text-[var(--muted-indigo)]">
            <span className="time-badge">
              {formatTime(event)}
            </span>
            {recurringSiblings.length ? (
              <span className="recurring-indicator" title={`Also on ${recurringSiblings.length} other day${recurringSiblings.length === 1 ? '' : 's'}`}>
                <RecurringIcon />
              </span>
            ) : null}
            {event.location.grid ? (
              <button
                type="button"
                className="grid-badge"
                onClick={() => onSelectGrid?.(event.location.grid)}
                title={`Show ${event.location.grid} on the map`}
              >
                {event.location.grid}
              </button>
            ) : null}
            <span className="truncate">{event.category}</span>
          </div>
          <button
            type="button"
            className="min-h-6 w-full rounded-md text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/30"
            onClick={() => setIsExpanded((value) => !value)}
            aria-expanded={isExpanded}
            title={compact ? 'Peek' : 'Open the tiny portal'}
          >
            <h3 className="mt-0.5 truncate text-sm font-semibold leading-5 text-indigo-brand">{event.title}</h3>
          </button>
        </div>
        <button
          type="button"
          className={`icon-button ${isFavorite ? 'is-active' : ''}`}
          onClick={() => onToggleFavorite(event.id)}
          aria-label={isFavorite ? 'Remove from My Schedule' : 'Add to My Schedule'}
          title={isFavorite ? 'Let this one go' : 'Keep this one'}
        >
          <StarIcon filled={isFavorite} />
        </button>
      </div>

      {isExpanded ? (
        <div className="mt-2 border-t border-indigo-brand/15 pt-2">
          <button
            type="button"
            className="min-h-10 rounded-md text-xs font-semibold text-pink transition-colors duration-200 hover:text-indigo-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/30"
            onClick={() => setIsExpanded(false)}
          >
            {compact ? 'Peek' : 'Open the tiny portal'}
            <span className="ml-1 text-[var(--muted-indigo)]">-</span>
          </button>

          {event.host ? <p className="mt-2 text-sm text-[var(--muted-indigo)]">{event.host}</p> : null}

          {warnings.length || softFlags.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {warnings.map((flag) => (
                <span className="warning-badge" key={flag.key}>
                  {flag.badge}
                </span>
              ))}
              {softFlags.map((flag) => (
                <span className="soft-badge" key={flag.key}>
                  {flag.badge}
                </span>
              ))}
            </div>
          ) : null}

          {note ? <p className="mt-2 text-xs font-medium text-pink">{note}</p> : null}

          {recurringSiblings.length ? (
            <div className="mt-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted-indigo)]">Also on:</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {recurringSiblings.map((sibling) => {
                  const siblingIsFavorite = siblingFavorite(sibling.id);
                  return (
                    <button
                      key={sibling.id}
                      type="button"
                      className={`recurring-chip ${siblingIsFavorite ? 'is-active' : ''}`}
                      onClick={() => onToggleFavorite(sibling.id)}
                      aria-pressed={siblingIsFavorite}
                      title={siblingIsFavorite ? 'Remove this day from My Schedule' : 'Add this day to My Schedule'}
                    >
                      <span>{formatSiblingDay(sibling)}</span>
                      <StarIcon filled={siblingIsFavorite} />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-2 space-y-2 text-sm leading-6 text-indigo-brand">
            {event.location.prose || event.location.raw ? (
              <p>
                <span className="text-[var(--muted-indigo)]">Where: </span>
                {event.location.prose || event.location.raw}
              </p>
            ) : null}
            {event.description ? <p className="whitespace-pre-line">{event.description}</p> : null}
            {event.comments ? <p className="text-[var(--muted-indigo)]">{event.comments}</p> : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
