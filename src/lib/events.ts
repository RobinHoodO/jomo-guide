import eventsJson from '../data/events.json';

export type FlagKey =
  | 'kid'
  | 'sexPositive'
  | 'queer'
  | 'adult'
  | 'sober'
  | 'warnSensory'
  | 'warnTriggering';

export type TimeWindowKey = 'morning' | 'afternoon' | 'evening' | 'night';

export type EventItem = {
  id: string;
  title: string;
  host: string;
  location: {
    raw: string;
    grid: string;
    prose: string;
  };
  category: string;
  vibes: string;
  day: string;
  dayDate: string;
  start: string;
  end: string;
  description: string;
  comments: string;
  flags: Record<FlagKey, boolean>;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  timeTBD: boolean;
  sortMinutes: number;
};

export type RecurringGroup = {
  key: string;
  occurrences: EventItem[];
};

export type GridPoint = {
  code: string;
  column: string;
  columnIndex: number;
  row: number;
};

export type MapEvent = {
  event: EventItem;
  grid: GridPoint;
  neighborhood: string;
};

export type MapCell = {
  code: string;
  column: string;
  row: number;
  events: EventItem[];
  eventCount: number;
  neighborhood: string | null;
};

export type Filters = {
  query: string;
  day: string | null;
  timeWindows: TimeWindowKey[];
  categories: string[];
  flags: FlagKey[];
  familyMode: boolean;
};

export const EVENTS = eventsJson as EventItem[];
export const PROGRAM_DAYS = Array.from(new Set(EVENTS.map((event) => event.day)));
export const CATEGORIES = Array.from(new Set(EVENTS.map((event) => event.category))).sort();

export const CATEGORY_COLORS: Record<string, string> = {
  'Art/Installation': '#45B5AA',
  'Food/Drinks': '#5B8FD9',
  'Care/Support/Pampering': '#F291B2',
  'Music/Performance/Show': '#232D5C',
  'Games/Play': '#7EC4E8',
  'Party/Gathering': '#C93A56',
  'Yoga/Movement/Bodywork': '#A6C544',
  'Workshop/Class': '#4C9F4A',
  'Weird shit/Other': '#8F5BB8',
  'Crafting/Pimping/Arting': '#E88A2E',
  'Ritual/Ceremony': '#E25B3C',
  Dating: '#F291B2'
};

function recurrenceKey(event: EventItem) {
  return `${event.title.trim().toLowerCase()}|${event.host.trim().toLowerCase()}`;
}

const recurringGroups = Array.from(
  EVENTS.reduce((acc, event) => {
    const key = recurrenceKey(event);
    const group = acc.get(key) || [];
    group.push(event);
    acc.set(key, group);
    return acc;
  }, new Map<string, EventItem[]>()).entries()
)
  .filter(([, occurrences]) => occurrences.length > 1 && occurrences.some((event) => event.comments.includes('Recurring:')))
  .map(([key, occurrences]) => ({
    key,
    occurrences: [...occurrences].sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)))
  }));

export const RECURRING_GROUPS: RecurringGroup[] = recurringGroups;

export const RECURRING_GROUP_BY_EVENT_ID = new Map<string, RecurringGroup>(
  recurringGroups.flatMap((group) => group.occurrences.map((event) => [event.id, group] as const))
);

export function getRecurringSiblings(event: EventItem) {
  return (
    RECURRING_GROUP_BY_EVENT_ID.get(event.id)?.occurrences.filter(
      (occurrence) => occurrence.id !== event.id && occurrence.dayDate !== event.dayDate
    ) || []
  );
}

export const TIME_WINDOWS: Array<{ key: TimeWindowKey; label: string; range: string; start: number; end: number }> = [
  { key: 'morning', label: 'Morning', range: '06-12', start: 6 * 60, end: 12 * 60 },
  { key: 'afternoon', label: 'Afternoon', range: '12-18', start: 12 * 60, end: 18 * 60 },
  { key: 'evening', label: 'Evening', range: '18-24', start: 18 * 60, end: 24 * 60 },
  { key: 'night', label: 'Night', range: '00-06', start: 0, end: 6 * 60 }
];

export const FLAG_FILTERS: Array<{ key: FlagKey; label: string; badge: string }> = [
  { key: 'kid', label: 'Kid-friendly', badge: 'Kid' },
  { key: 'sober', label: 'Sober', badge: 'Sober' },
  { key: 'queer', label: 'Queer-inclusive', badge: 'Queer' },
  { key: 'sexPositive', label: 'Sex positive', badge: 'Sex+' },
  { key: 'adult', label: 'Adults only', badge: 'Adult' },
  { key: 'warnSensory', label: 'Sensory content', badge: 'Sensory' },
  { key: 'warnTriggering', label: 'Triggering themes', badge: 'Trigger' }
];

export const WARNING_FLAGS: FlagKey[] = ['warnSensory', 'warnTriggering'];

export function parseGridCode(value: string): GridPoint | null {
  const match = value.trim().match(/^([A-Z])\s*0*(\d{1,2})$/i);
  if (!match) return null;
  const column = match[1].toUpperCase();
  const row = Number(match[2]);
  if (!Number.isFinite(row)) return null;
  return {
    code: `${column}${String(row).padStart(2, '0')}`,
    column,
    columnIndex: column.charCodeAt(0) - 64,
    row
  };
}

export const OFFICIAL_MAP_NEIGHBORHOODS = [
  'Arctic Chill',
  'Highlands',
  'Lowlands',
  'Moomin Valley',
  'Pretty Parking',
  'The Villa',
  'Missing Piece',
  'Swamp',
  'Downtown',
  'Sunny Hills',
  'Bison - North',
  'Bison - South',
  'Forest Cave',
  'Wedge',
  'Eastern Slope',
  'Far Flung Field'
];

export const ELSEWHERE_NEIGHBORHOOD = 'Elsewhere';

function normalizeNeighborhoodText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getNeighborhood(event: EventItem) {
  const locationText = `${event.location.prose || ''} ${event.location.raw || ''}`;
  const normalized = normalizeNeighborhoodText(locationText);
  if (!normalized) return ELSEWHERE_NEIGHBORHOOD;

  if (normalized.includes('bison')) {
    return normalized.includes('south') ? 'Bison - South' : 'Bison - North';
  }

  return (
    OFFICIAL_MAP_NEIGHBORHOODS.find(
      (neighborhood) =>
        !neighborhood.startsWith('Bison') &&
        normalized.includes(normalizeNeighborhoodText(neighborhood))
    ) || ELSEWHERE_NEIGHBORHOOD
  );
}

function mostCommonNeighborhood(events: MapEvent[]) {
  const counts = new Map<string, number>();
  for (const item of events) {
    counts.set(item.neighborhood, (counts.get(item.neighborhood) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
}

export const MAP_EVENTS: MapEvent[] = EVENTS.flatMap((event) => {
  const grid = parseGridCode(event.location.grid);
  return grid ? [{ event, grid, neighborhood: getNeighborhood(event) }] : [];
});

export const FREE_FLOATING_EVENT_COUNT = EVENTS.length - MAP_EVENTS.length;

export const GRID_BOUNDS = {
  minColumnIndex: 1,
  maxColumnIndex: 26,
  minRow: 1,
  maxRow: 26
};

export const MAP_COLUMNS = Array.from(
  { length: GRID_BOUNDS.maxColumnIndex - GRID_BOUNDS.minColumnIndex + 1 },
  (_, index) => String.fromCharCode(GRID_BOUNDS.minColumnIndex + index + 64)
);

export const MAP_ROWS = Array.from(
  { length: GRID_BOUNDS.maxRow - GRID_BOUNDS.minRow + 1 },
  (_, index) => GRID_BOUNDS.minRow + index
);

const mapEventsByCode = MAP_EVENTS.reduce((acc, item) => {
  const group = acc.get(item.grid.code) || [];
  group.push(item);
  acc.set(item.grid.code, group);
  return acc;
}, new Map<string, MapEvent[]>());

export const MAP_CELLS: MapCell[] = MAP_COLUMNS.flatMap((column) =>
  MAP_ROWS.map((row) => {
    const code = `${column}${String(row).padStart(2, '0')}`;
    const items = mapEventsByCode.get(code) || [];
    return {
      code,
      column,
      row,
      events: items.map((item) => item.event),
      eventCount: items.length,
      neighborhood: mostCommonNeighborhood(items)
    };
  })
);

export const MAP_CELLS_BY_CODE = new Map(MAP_CELLS.map((cell) => [cell.code, cell]));

export const MAP_NEIGHBORHOODS = [...OFFICIAL_MAP_NEIGHBORHOODS, ELSEWHERE_NEIGHBORHOOD];

export function getNow() {
  const override = new URLSearchParams(window.location.search).get('now');
  const parsed = override ? new Date(override) : new Date();
  if (!Number.isNaN(parsed.getTime()) && isDuringProgram(parsed)) return parsed;
  return new Date('2026-07-18T12:00:00');
}

export function isDuringProgram(date: Date) {
  return date >= new Date('2026-07-18T00:00:00') && date <= new Date('2026-07-28T00:00:00');
}

export function formatTime(event: EventItem) {
  if (event.timeTBD) return 'time TBD';
  if (event.allDay) return 'all day';
  return `${event.start}-${event.end}`;
}

export function eventTimestamp(value: string | null) {
  return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;
}

export function isHappeningNow(event: EventItem, now = getNow()) {
  if (event.timeTBD || !event.startsAt || !event.endsAt) return false;
  const t = now.getTime();
  return t >= eventTimestamp(event.startsAt) && t <= eventTimestamp(event.endsAt);
}

export function isStartingSoon(event: EventItem, now = getNow(), hours = 4) {
  if (event.timeTBD || !event.startsAt) return false;
  const diff = eventTimestamp(event.startsAt) - now.getTime();
  return diff > 0 && diff <= hours * 60 * 60 * 1000;
}

export function filterEvents(events: EventItem[], filters: Filters) {
  const query = filters.query.trim().toLowerCase();
  return events.filter((event) => {
    if (filters.day && event.day !== filters.day) return false;

    if (filters.timeWindows.length) {
      const startsInWindow = TIME_WINDOWS.some(
        (window) =>
          filters.timeWindows.includes(window.key) &&
          event.sortMinutes >= window.start &&
          event.sortMinutes < window.end
      );
      if (!event.allDay && !startsInWindow) return false;
    }

    if (filters.familyMode) {
      if (!event.flags.kid || !event.flags.sober || event.flags.adult || event.flags.warnTriggering) {
        return false;
      }
    }

    if (filters.categories.length && !filters.categories.includes(event.category)) return false;
    if (filters.flags.some((flag) => !event.flags[flag])) return false;

    if (!query) return true;
    const haystack = [
      event.title,
      event.host,
      event.location.raw,
      event.location.grid,
      event.category,
      event.vibes,
      event.description
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function groupByDay(events: EventItem[]) {
  return PROGRAM_DAYS.map((day) => ({
    day,
    events: events.filter((event) => event.day === day)
  })).filter((group) => group.events.length > 0);
}

export function pickSerendipity(events: EventItem[], now = getNow()) {
  if (!events.length) return null;
  const soon = events.filter((event) => isHappeningNow(event, now) || isStartingSoon(event, now, 6));
  const pool = soon.length && Math.random() < 0.7 ? soon : events;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function hasOverlap(a: EventItem, b: EventItem) {
  if (a.id === b.id || a.timeTBD || b.timeTBD || a.allDay || b.allDay) return false;
  const aStart = eventTimestamp(a.startsAt);
  const aEnd = eventTimestamp(a.endsAt);
  const bStart = eventTimestamp(b.startsAt);
  const bEnd = eventTimestamp(b.endsAt);
  return aStart < bEnd && bStart < aEnd;
}

export function dayIsLight(events: EventItem[]) {
  return events.length > 0 && events.length <= 1;
}
