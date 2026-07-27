import { getCurrentCell } from '../lib/whereami';
import { parseGridCode } from '../lib/events';
import type { CapacityType } from '../lib/missions';

export type MissionSort = 'newest' | 'oldest' | 'closest' | 'expiring';

export type MissionFilters = {
  query: string;
  capacityTypes: CapacityType[];
  hereOnly: boolean;
  needsApproval: boolean;
  hasPrize: boolean;
  starred: boolean;
  sort: MissionSort;
};

type MissionFilterBarProps = {
  filters: MissionFilters;
  setFilters: (filters: MissionFilters) => void;
  hiddenCount: number;
  onRestoreHidden: () => void;
};

const CAPACITY_TYPES: Array<{ value: CapacityType; label: string }> = [
  { value: 'open', label: 'Open to everyone' },
  { value: 'limited', label: 'Limited spots' },
  { value: 'exclusive', label: 'One person only' }
];

export function MissionFilterBar({ filters, setFilters, hiddenCount, onRestoreHidden }: MissionFilterBarProps) {
  const canSortByDistance = Boolean(parseGridCode(getCurrentCell() ?? ''));

  const toggleCapacityType = (capacityType: CapacityType) => {
    const capacityTypes = filters.capacityTypes.includes(capacityType)
      ? filters.capacityTypes.filter((item) => item !== capacityType)
      : [...filters.capacityTypes, capacityType];
    setFilters({ ...filters, capacityTypes });
  };

  return (
    <section className="glass filter-glass sticky top-2 z-20 p-3">
      <label className="sr-only" htmlFor="mission-search">
        Search missions
      </label>
      <input
        id="mission-search"
        className="search-input"
        value={filters.query}
        onChange={(event) => setFilters({ ...filters, query: event.target.value })}
        placeholder="Search mission title or description..."
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="hour-select-label">
          <span>Sort</span>
          <select
            className="hour-select"
            value={filters.sort}
            onChange={(event) => setFilters({ ...filters, sort: event.target.value as MissionSort })}
            title={canSortByDistance ? undefined : 'Place yourself on the map first to sort by distance.'}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="closest" disabled={!canSortByDistance}>
              {canSortByDistance ? 'Closest to me' : 'Closest to me — place yourself on the map first'}
            </option>
            <option value="expiring">Expiring soon</option>
          </select>
        </label>
        {hiddenCount ? (
          <button type="button" className="restore-hidden" onClick={onRestoreHidden}>
            {hiddenCount} hidden · restore
          </button>
        ) : null}
      </div>

      {!canSortByDistance ? <p className="mt-1 text-[10px] font-semibold text-cream/75">Place yourself on the map first to sort by distance.</p> : null}

      <div className="scroll-chips mt-2">
        {CAPACITY_TYPES.map((capacityType) => (
          <button
            type="button"
            key={capacityType.value}
            className={`chip ${filters.capacityTypes.includes(capacityType.value) ? 'is-active' : ''}`}
            onClick={() => toggleCapacityType(capacityType.value)}
            aria-pressed={filters.capacityTypes.includes(capacityType.value)}
          >
            {capacityType.label}
          </button>
        ))}
      </div>

      <div className="scroll-chips mt-1.5">
        <button
          type="button"
          className={`chip ${filters.hereOnly ? 'is-active' : ''}`}
          onClick={() => setFilters({ ...filters, hereOnly: !filters.hereOnly })}
          aria-pressed={filters.hereOnly}
        >
          Here only
        </button>
        <button
          type="button"
          className={`chip ${filters.needsApproval ? 'is-active' : ''}`}
          onClick={() => setFilters({ ...filters, needsApproval: !filters.needsApproval })}
          aria-pressed={filters.needsApproval}
        >
          Needs approval
        </button>
        <button
          type="button"
          className={`chip ${filters.hasPrize ? 'is-active' : ''}`}
          onClick={() => setFilters({ ...filters, hasPrize: !filters.hasPrize })}
          aria-pressed={filters.hasPrize}
        >
          Has a prize
        </button>
        <button
          type="button"
          className={`chip ${filters.starred ? 'is-active' : ''}`}
          onClick={() => setFilters({ ...filters, starred: !filters.starred })}
          aria-pressed={filters.starred}
        >
          Starred
        </button>
      </div>
    </section>
  );
}
