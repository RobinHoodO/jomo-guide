import { useMemo, useState, type CSSProperties } from 'react';
import {
  DEST_CATEGORIES,
  DEST_CATEGORY_COLORS,
  DESTINATIONS,
  filterDestinations,
  type Destination
} from '../lib/destinations';

type DestinationsProps = {
  onSelectGrid: (grid: string) => void;
};

function DestinationCard({
  destination,
  onSelectGrid
}: {
  destination: Destination;
  onSelectGrid: (grid: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const color = DEST_CATEGORY_COLORS[destination.category] || 'var(--pink)';
  const style = { '--category-color': color } as CSSProperties;

  return (
    <article className="event-card is-collapsed" style={style}>
      <div className="event-meta-row">
        {destination.location.grid ? (
          <button
            type="button"
            className="grid-badge"
            onClick={() => onSelectGrid(destination.location.grid)}
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
        onClick={() => setIsExpanded((value) => !value)}
        aria-expanded={isExpanded}
        title="Open"
      >
        <h3 className="text-sm font-semibold leading-5 text-indigo-brand">{destination.title}</h3>
      </button>

      {isExpanded ? (
        <div className="event-expanded space-y-2">
          {destination.tags ? <p className="text-xs font-semibold leading-5 text-pink">{destination.tags}</p> : null}
          {destination.description ? (
            <p className="whitespace-pre-line text-sm leading-6 text-indigo-brand">{destination.description}</p>
          ) : null}
          {destination.location.prose ? (
            <p className="text-xs leading-5 text-[var(--muted-indigo)]">📍 {destination.location.prose}</p>
          ) : null}
          <button type="button" className="event-collapse-button" onClick={() => setIsExpanded(false)}>
            close
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function Destinations({ onSelectGrid }: DestinationsProps) {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const visible = useMemo(() => filterDestinations(DESTINATIONS, query, categories), [query, categories]);

  const toggleCategory = (category: string) => {
    setCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  };

  return (
    <div className="space-y-5">
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
              <DestinationCard key={destination.id} destination={destination} onSelectGrid={onSelectGrid} />
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
