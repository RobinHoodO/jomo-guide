import { DESTINATIONS, type Destination } from './destinations';
import { EVENTS, type EventItem } from './events';

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const TITLE_ENTRIES = DESTINATIONS.map((destination) => [normalize(destination.title), destination] as const).filter(
  ([title]) => title
);

const TITLE_INDEX = new Map(TITLE_ENTRIES);

if (import.meta.env.DEV) {
  const titleGroups = new Map<string, string[]>();
  for (const [title, destination] of TITLE_ENTRIES) {
    titleGroups.set(title, [...(titleGroups.get(title) || []), destination.title]);
  }
  const duplicateTitles = [...titleGroups.values()].filter((titles) => titles.length > 1);
  if (duplicateTitles.length) {
    console.warn('Duplicate destination titles in link index:', duplicateTitles);
  }
}

function resolveCamp(event: EventItem): Destination | null {
  const host = event.host.trim();
  if (!host) return null;

  const wholeHost = TITLE_INDEX.get(normalize(host));
  if (wholeHost) return wholeHost;

  const segments = host
    .split(/\s*(?:[/|@,]|\bat\b)\s*/i)
    .map((segment) => normalize(segment))
    .filter(Boolean);
  const candidates = segments.length ? [segments[segments.length - 1], ...segments.slice(0, -1)] : [];

  for (const segment of candidates) {
    const destination = TITLE_INDEX.get(segment);
    if (destination) return destination;
  }

  return null;
}

const EVENT_TO_CAMP = new Map<string, Destination>();
const CAMP_TO_EVENTS = new Map<string, EventItem[]>();

for (const event of EVENTS) {
  const camp = resolveCamp(event);
  if (!camp) continue;
  EVENT_TO_CAMP.set(event.id, camp);
  const events = CAMP_TO_EVENTS.get(camp.id) || [];
  events.push(event);
  CAMP_TO_EVENTS.set(camp.id, events);
}

export function campForEvent(event: EventItem): Destination | null {
  return EVENT_TO_CAMP.get(event.id) || null;
}

export function eventsForCamp(campId: string): EventItem[] {
  return CAMP_TO_EVENTS.get(campId) || [];
}
