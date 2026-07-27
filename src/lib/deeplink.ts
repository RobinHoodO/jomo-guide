import type { EventItem } from './events';

export type EventShareResult =
  | { ok: true; method: 'share' | 'copy' }
  | { ok: false };

export function readEventIdFromUrl() {
  return new URLSearchParams(window.location.search).get('e');
}

export function eventShareUrl(id: string) {
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set('e', id);
  return url.toString();
}

export function clearEventParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete('e');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export async function shareEvent(event: EventItem): Promise<EventShareResult> {
  const url = eventShareUrl(event.id);

  if (navigator.share) {
    try {
      await navigator.share({
        title: event.title,
        text: `Come to ${event.title} at Borderland.`,
        url
      });
      return { ok: true, method: 'share' };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return { ok: false };
      return { ok: false };
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return { ok: true, method: 'copy' };
  } catch {
    return { ok: false };
  }
}
