import destinationsJson from '../data/destinations.json';

export type Destination = {
  id: string;
  title: string;
  category: string;
  tags: string;
  location: { raw: string; grid: string; prose: string };
  description: string;
};

export const DESTINATIONS = destinationsJson as Destination[];

export const DEST_CATEGORIES = Array.from(
  new Set(DESTINATIONS.map((destination) => destination.category).filter(Boolean))
).sort();

// Same palette as the event categories, keyed to the destination category labels.
export const DEST_CATEGORY_COLORS: Record<string, string> = {
  'Art/Installation': '#45B5AA',
  'Food/Drinks': '#5B8FD9',
  'Care/Support': '#F291B2',
  'Pampering/Care': '#F291B2',
  'Music/Show': '#232D5C',
  'Games/Play': '#7EC4E8',
  'Party/Gathering': '#C93A56',
  'Movement/Bodywork': '#A6C544',
  'Workshop/Class': '#4C9F4A',
  'Weird shit/Other': '#8F5BB8',
  'Crafting/Arting': '#E88A2E',
  'Ritual/Ceremony': '#E25B3C'
};

export function filterDestinations(destinations: Destination[], query: string, categories: string[]) {
  const q = query.trim().toLowerCase();
  return destinations.filter((destination) => {
    if (categories.length && !categories.includes(destination.category)) return false;
    if (!q) return true;
    const haystack = `${destination.title} ${destination.category} ${destination.tags} ${destination.location.raw} ${destination.description}`;
    return haystack.toLowerCase().includes(q);
  });
}
