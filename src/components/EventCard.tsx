import { useState, type CSSProperties } from 'react';
import {
  CATEGORY_COLORS,
  FLAG_FILTERS,
  WARNING_FLAGS,
  type EventItem,
  formatTime,
  getRecurringSiblings
} from '../lib/events';
import { campForEvent } from '../lib/links';
import { downloadEventIcs } from '../lib/ics';

type EventCardHeadingLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

type EventCardProps = {
  event: EventItem;
  isFavorite: boolean;
  isOccurrenceFavorite?: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onSelectGrid?: (grid: string) => void;
  onSelectCamp?: (campId: string) => void;
  compact?: boolean;
  muted?: boolean;
  note?: string;
  headingLevel?: EventCardHeadingLevel;
  showCalendarExport?: boolean;
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

function CalendarIcon() {
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
      <path d="M8 3v3M16 3v3M4 8h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M12 12v5M9.5 14.5 12 17l2.5-2.5" />
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
  onSelectCamp,
  muted = false,
  note,
  headingLevel = 'h3',
  showCalendarExport = false
}: EventCardProps) {
  const visibleFlags = FLAG_FILTERS.filter(({ key }) => event.flags[key]);
  const warnings = visibleFlags.filter(({ key }) => WARNING_FLAGS.includes(key));
  const softFlags = visibleFlags.filter(({ key }) => !WARNING_FLAGS.includes(key));
  const recurringSiblings = getRecurringSiblings(event);
  const [isExpanded, setIsExpanded] = useState(false);
  const siblingFavorite = isOccurrenceFavorite || ((id: string) => id === event.id && isFavorite);
  const categoryColor = CATEGORY_COLORS[event.category] || 'var(--pink)';
  const cardStyle = { '--category-color': categoryColor } as CSSProperties;
  const hostCamp = onSelectCamp ? campForEvent(event) : null;
  const TitleHeading = headingLevel;
  const toggleExpanded = () => setIsExpanded((value) => !value);

  return (
    <article
      className={`event-card ${isExpanded ? 'is-expanded' : 'is-collapsed'} ${muted ? 'opacity-55 grayscale' : ''}`}
      style={cardStyle}
    >
      <div className="flex cursor-pointer items-start gap-2.5" onClick={toggleExpanded}>
        <div className="min-w-0 flex-1">
          <div className="event-meta-row">
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
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  onSelectGrid?.(event.location.grid);
                }}
                title={`Show ${event.location.grid} on the map`}
              >
                {event.location.grid}
              </button>
            ) : null}
            <span className="category-label truncate">
              <span aria-hidden="true" />
              {event.category}
            </span>
          </div>
          <button
            type="button"
            className="event-title-button"
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              toggleExpanded();
            }}
            aria-expanded={isExpanded}
            title="Open / close"
          >
            <TitleHeading className="truncate text-sm font-semibold leading-5 text-indigo-brand">
              {event.title}
            </TitleHeading>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {showCalendarExport ? (
            <button
              type="button"
              className="icon-button"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                downloadEventIcs(event);
              }}
              aria-label="Add to your calendar (.ics)"
              title="Add to your calendar"
            >
              <CalendarIcon />
            </button>
          ) : null}
          <button
            type="button"
            className={`icon-button ${isFavorite ? 'is-active' : ''}`}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              onToggleFavorite(event.id);
            }}
            aria-label={isFavorite ? 'Remove from My Schedule' : 'Add to My Schedule'}
            title={isFavorite ? 'Let this one go' : 'Keep this one'}
          >
            <StarIcon filled={isFavorite} />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="event-expanded">
          {event.host ? (
            <p className="event-host">
              {hostCamp ? (
                <button
                  type="button"
                  className="camp-chip"
                  onClick={() => onSelectCamp?.(hostCamp.id)}
                  title={`Open ${hostCamp.title} in Camps`}
                >
                  🏕 {hostCamp.title}
                </button>
              ) : (
                event.host
              )}
            </p>
          ) : null}

          {warnings.length || softFlags.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {warnings.map((flag) => (
                <span className="warning-badge" key={flag.key}>
                  {flag.icon} {flag.badge}
                </span>
              ))}
              {softFlags.map((flag) => (
                <span className="soft-badge" key={flag.key}>
                  {flag.icon} {flag.badge}
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

          <div className="event-detail">
            {event.location.prose || event.location.raw ? (
              <p>
                <span>Where</span>
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
