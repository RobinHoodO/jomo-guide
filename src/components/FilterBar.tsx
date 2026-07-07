import type { CSSProperties } from 'react';
import {
  CATEGORIES,
  CATEGORY_COLORS,
  FLAG_FILTERS,
  PROGRAM_DAYS,
  TIME_WINDOWS,
  type Filters,
  type FlagKey,
  type TimeWindowKey
} from '../lib/events';

type FilterBarProps = {
  filters: Filters;
  setFilters: (filters: Filters) => void;
};

export function FilterBar({ filters, setFilters }: FilterBarProps) {
  const toggleDay = (day: string | null) => {
    setFilters({ ...filters, day });
  };

  const toggleTimeWindow = (timeWindow: TimeWindowKey) => {
    const timeWindows = filters.timeWindows.includes(timeWindow)
      ? filters.timeWindows.filter((item) => item !== timeWindow)
      : [...filters.timeWindows, timeWindow];
    setFilters({ ...filters, timeWindows });
  };

  const toggleCategory = (category: string) => {
    const categories = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];
    setFilters({ ...filters, categories });
  };

  const toggleFlag = (flag: FlagKey) => {
    const flags = filters.flags.includes(flag)
      ? filters.flags.filter((item) => item !== flag)
      : [...filters.flags, flag];
    setFilters({ ...filters, flags });
  };

  return (
    <section className="glass sticky top-0 z-20 -mx-4 px-4 py-2.5">
      <label className="sr-only" htmlFor="program-search">
        Search program
      </label>
      <input
        id="program-search"
        className="search-input"
        value={filters.query}
        onChange={(event) => setFilters({ ...filters, query: event.target.value })}
        placeholder="Search title, camp, place, tiny chaos..."
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={filters.familyMode}
            onChange={(event) => setFilters({ ...filters, familyMode: event.target.checked })}
          />
          <span>family mode</span>
        </label>
        <button
          type="button"
          className="min-h-8 rounded-md px-1 text-[10px] font-black leading-[11px] text-cream transition-colors duration-200 hover:text-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35"
          onClick={() =>
            setFilters({ query: '', day: null, timeWindows: [], categories: [], flags: [], familyMode: false })
          }
        >
          clear
        </button>
      </div>

      <div className="scroll-chips mt-2">
        <button
          type="button"
          className={`chip ${filters.day === null ? 'is-active' : ''}`}
          onClick={() => toggleDay(null)}
        >
          All days
        </button>
        {PROGRAM_DAYS.map((day) => (
          <button
            type="button"
            key={day}
            className={`chip ${filters.day === day ? 'is-active' : ''}`}
            onClick={() => toggleDay(day)}
          >
            {day.replace('.', '').replace(' July', '')}
          </button>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {TIME_WINDOWS.map((timeWindow) => (
          <button
            type="button"
            key={timeWindow.key}
            className={`chip justify-center ${filters.timeWindows.includes(timeWindow.key) ? 'is-active' : ''}`}
            onClick={() => toggleTimeWindow(timeWindow.key)}
            title={`${timeWindow.label} (${timeWindow.range})`}
          >
            {timeWindow.label} ({timeWindow.range})
          </button>
        ))}
      </div>

      <div className="scroll-chips mt-2">
        {CATEGORIES.map((category) => (
          <button
            type="button"
            key={category}
            className={`chip category-chip ${filters.categories.includes(category) ? 'is-active' : ''}`}
            style={{ '--category-color': CATEGORY_COLORS[category] || 'var(--pink)' } as CSSProperties}
            onClick={() => toggleCategory(category)}
          >
            <span aria-hidden="true" />
            {category}
          </button>
        ))}
      </div>

      <div className="scroll-chips mt-1.5">
        {FLAG_FILTERS.map((flag) => (
          <button
            type="button"
            key={flag.key}
            className={`chip ${filters.flags.includes(flag.key) ? 'is-active' : ''}`}
            onClick={() => toggleFlag(flag.key)}
          >
            {flag.label}
          </button>
        ))}
      </div>
    </section>
  );
}
