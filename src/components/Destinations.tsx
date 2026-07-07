import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { EventCard } from './EventCard';
import {
  DEST_CATEGORIES,
  DEST_CATEGORY_COLORS,
  DESTINATIONS,
  filterDestinations,
  type Destination
} from '../lib/destinations';
import { eventsForCamp } from '../lib/links';

type CampSelection = { id: string; token: number };

type DestinationsProps = {
  selectedCamp: CampSelection | null;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  onSelectGrid: (grid: string) => void;
  onSelectCamp: (campId: string) => void;
};

function DestinationCard({
  destination,
  selectedCamp,
  isFavorite,
  toggleFavorite,
  onSelectGrid,
  onSelectCamp
}: {
  destination: Destination;
  selectedCamp: CampSelection | null;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  onSelectGrid: (grid: string) => void;
  onSelectCamp: (campId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const color = DEST_CATEGORY_COLORS[destination.category] || 'var(--pink)';
  const style = { '--category-color': color } as CSSProperties;
  const campEvents = eventsForCamp(destination.id);
  const toggleExpanded = () => setIsExpanded((value) => !value);

  useEffect(() => {
    if (selectedCamp?.id !== destination.id) return;
    setIsExpanded(true);
    window.requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [selectedCamp, destination.id]);

  return (
    <article
      ref={cardRef}
      id={`camp-${destination.id}`}
      className={`event-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
      style={style}
    >
      <div className="cursor-pointer" onClick={toggleExpanded}>
        <div className="event-meta-row">
          {destination.location.grid ? (
            <button
              type="button"
              className="grid-badge"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onSelectGrid(destination.location.grid);
              }}
              title={`Show ${destination.location.grid} on the map`}
            >
              {destination.location.grid}
            </button>
          ) : (
            <span className="soft-badge">roaming</span>
          )}
          <span className="category-label truncate">
            <span aria-hidden="true" />
            {destination.category || 'Destination'}
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
          <h3 className="text-sm font-semibold leading-5 text-indigo-brand">{destination.title}</h3>
        </button>
      </div>

      {isExpanded ? (
        <div className="event-expanded space-y-2">
          {destination.tags ? <p className="text-xs font-semibold leading-5 text-pink">{destination.tags}</p> : null}
          {destination.description ? (
            <p className="whitespace-pre-line text-sm leading-6 text-indigo-brand">{destination.description}</p>
          ) : null}
          {destination.location.prose ? (
            <p className="text-xs leading-5 text-[var(--muted-indigo)]">📍 {destination.location.prose}</p>
          ) : null}
          {campEvents.length ? (
            <div className="space-y-2 border-t border-indigo-brand/15 pt-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted-indigo)]">
                Events here ({campEvents.length})
              </h4>
              <div className="space-y-2">
                {campEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isFavorite={isFavorite(event.id)}
                    isOccurrenceFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    onSelectGrid={onSelectGrid}
                    onSelectCamp={onSelectCamp}
                    headingLevel="h5"
                    compact
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function Destinations({
  selectedCamp,
  isFavorite,
  toggleFavorite,
  onSelectGrid,
  onSelectCamp
}: DestinationsProps) {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const visible = useMemo(() => filterDestinations(DESTINATIONS, query, categories), [query, categories]);

  useEffect(() => {
    if (!selectedCamp) return;
    const targetExists = DESTINATIONS.some((destination) => destination.id === selectedCamp.id);
    const targetVisible = visible.some((destination) => destination.id === selectedCamp.id);
    if (targetExists && !targetVisible && (query || categories.length)) {
      setQuery('');
      setCategories([]);
    }
  }, [selectedCamp, visible, query, categories.length]);

  const toggleCategory = (category: string) => {
    setCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  };

  return (
    <div id="camps-tab" className="space-y-5 scroll-mt-4">
      <section className="space-y-1.5">
        <p className="section-kicker">Destinations</p>
        <h2 className="display-heading text-lg">Camps & dreams to wander into</h2>
        <p className="text-sm leading-5 text-cream">
          {DESTINATIONS.length} places on the playa. Tap a grid square to find it on the map.
        </p>
      </section>

      <section className="glass filter-glass sticky top-2 z-20 space-y-2 p-3">
        <label className="sr-only" htmlFor="destinations-search">
          Search destinations
        </label>
        <input
          id="destinations-search"
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search camp, place, vibe, tiny wonder..."
        />
        <div className="scroll-chips">
          {DEST_CATEGORIES.map((category) => (
            <button
              type="button"
              key={category}
              className={`chip category-chip ${categories.includes(category) ? 'is-active' : ''}`}
              style={{ '--category-color': DEST_CATEGORY_COLORS[category] || 'var(--pink)' } as CSSProperties}
              onClick={() => toggleCategory(category)}
            >
              <span aria-hidden="true" />
              {category}
            </button>
          ))}
          {categories.length ? (
            <button type="button" className="chip" onClick={() => setCategories([])}>
              clear
            </button>
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-1.5">
          <h3 className="display-heading text-base text-cream">{visible.length} destinations</h3>
        </div>
        {visible.length ? (
          <div className="space-y-2">
            {visible.map((destination) => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                selectedCamp={selectedCamp}
                isFavorite={isFavorite}
                toggleFavorite={toggleFavorite}
                onSelectGrid={onSelectGrid}
                onSelectCamp={onSelectCamp}
              />
            ))}
          </div>
        ) : (
          <p className="panel-card text-base text-[var(--muted-indigo)]">
            No camps match. The playa keeps its secrets today.
          </p>
        )}
      </section>
    </div>
  );
}
