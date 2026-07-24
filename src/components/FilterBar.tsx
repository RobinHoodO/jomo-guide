import type { CSSProperties } from 'react';
import {
  CATEGORIES,
  CATEGORY_COLORS,
  FLAG_FILTERS,
  PROGRAM_DAYS,
  visibleProgramDays,
  type Filters,
  type FlagKey
} from '../lib/events';

type FilterBarProps = {
  filters: Filters;
  setFilters: (filters: Filters) => void;
};

const FROM_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const TO_HOURS = Array.from({ length: 24 }, (_, index) => index + 1);

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function parseHour(value: string) {
  return value === '' ? null : Number(value);
}

export function FilterBar({ filters, setFilters }: FilterBarProps) {
  const days = filters.showPast ? PROGRAM_DAYS : visibleProgramDays();

  const toggleDay = (day: string | null) => {
    setFilters({ ...filters, day });
  };

  const toggleShowPast = (showPast: boolean) => {
    const dayIsHidden = filters.day !== null && !visibleProgramDays().includes(filters.day);
    setFilters({ ...filters, showPast, day: !showPast && dayIsHidden ? null : filters.day });
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
    <section className="glass filter-glass sticky top-2 z-20 p-3">
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
        <div className="flex items-center gap-3">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={filters.familyMode}
              onChange={(event) => setFilters({ ...filters, familyMode: event.target.checked })}
            />
            <span>family mode</span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={filters.showPast}
              onChange={(event) => toggleShowPast(event.target.checked)}
            />
            <span>past events</span>
          </label>
        </div>
        <button
          type="button"
          className="min-h-8 rounded-md px-1 text-[10px] font-black leading-[11px] text-cream transition-colors duration-200 hover:text-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/35"
          onClick={() =>
            setFilters({
              query: '',
              day: null,
              hourFrom: null,
              hourTo: null,
              categories: [],
              flags: [],
              familyMode: false,
              showPast: false
            })
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
        {days.map((day) => (
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

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="section-kicker text-cream">time</span>
        <label className="hour-select-label">
          <span>From</span>
          <select
            className="hour-select"
            value={filters.hourFrom ?? ''}
            onChange={(event) => setFilters({ ...filters, hourFrom: parseHour(event.target.value) })}
          >
            <option value="">Any</option>
            {FROM_HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {formatHour(hour)}
              </option>
            ))}
          </select>
        </label>
        <label className="hour-select-label">
          <span>To</span>
          <select
            className="hour-select"
            value={filters.hourTo ?? ''}
            onChange={(event) => setFilters({ ...filters, hourTo: parseHour(event.target.value) })}
          >
            <option value="">Any</option>
            {TO_HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {formatHour(hour)}
              </option>
            ))}
          </select>
        </label>
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
            {flag.icon} {flag.label}
          </button>
        ))}
      </div>
    </section>
  );
}
