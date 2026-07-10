import type { EventItem } from './events';

// ponytail: floating local time (no Z / no TZID) — everyone at Borderland is on
// Swedish wall-clock time, so "as displayed" is correct and we skip VTIMEZONE.

function escapeText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// "2026-07-18T14:00:00" -> "20260718T140000"
function toLocalStamp(isoish: string) {
  return isoish.replace(/[-:]/g, '').replace(/\.\d+$/, '').slice(0, 15);
}

// "2026-07-20" -> "20260720"
function toDate(dayDate: string) {
  return dayDate.replace(/-/g, '');
}

function nextDay(dayDate: string) {
  const d = new Date(`${dayDate}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return toDate(d.toISOString().slice(0, 10));
}

export function buildEventIcs(event: EventItem): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JOMO Guide//Borderland 2026//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@jomoguide.com`,
    `DTSTAMP:${toLocalStamp(new Date().toISOString())}`
  ];

  if (event.allDay || event.timeTBD || !event.startsAt) {
    lines.push(`DTSTART;VALUE=DATE:${toDate(event.dayDate)}`);
    lines.push(`DTEND;VALUE=DATE:${nextDay(event.dayDate)}`);
  } else {
    lines.push(`DTSTART:${toLocalStamp(event.startsAt)}`);
    lines.push(`DTEND:${toLocalStamp(event.endsAt || event.startsAt)}`);
  }

  lines.push(`SUMMARY:${escapeText(event.title)}`);

  const where = [event.location.prose || event.location.raw, event.location.grid]
    .filter(Boolean)
    .join(' · ');
  if (where) lines.push(`LOCATION:${escapeText(where)}`);

  const desc = [
    event.host ? `Host: ${event.host}` : '',
    event.category ? `Category: ${event.category}` : '',
    event.timeTBD ? 'Time: TBD' : '',
    event.description || '',
    event.comments || ''
  ]
    .filter(Boolean)
    .join('\n\n');
  if (desc) lines.push(`DESCRIPTION:${escapeText(desc)}`);

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadEventIcs(event: EventItem) {
  const blob = new Blob([buildEventIcs(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
