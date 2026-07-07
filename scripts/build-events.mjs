import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const CONFIG = {
  eventName: 'Borderland 2026',
  year: 2026,
  sheetUrl:
    'https://docs.google.com/spreadsheets/d/1lQycr19AhDhuU2h5LjFb6kkgraafageu2VBnalK-bto/export?format=csv&gid=1641296636',
  snapshotPath: 'program-snapshot.csv',
  outputPath: 'src/data/events.json',
  publicOutputPath: 'public/events.json',
  warningsPath: 'data-warnings.txt',
  dayToDate: {
    'Sat. 18 July': '2026-07-18',
    'Sun. 19 July': '2026-07-19',
    'Mon. 20 July': '2026-07-20',
    'Tue. 21 July': '2026-07-21',
    'Wed. 22 July': '2026-07-22',
    'Thu. 23 July': '2026-07-23',
    'Fri. 24 July': '2026-07-24',
    'Sat. 25 July': '2026-07-25',
    'Sun. 26 July': '2026-07-26',
    'Mon. 27 July': '2026-07-27'
  },
  columns: {
    day: 'Day',
    title: 'Title',
    start: 'Start',
    end: 'End',
    host: 'Facilitator/\nHost camp',
    location: 'Location',
    category: 'Category',
    vibes: 'Vibes',
    description: 'Description',
    comments: 'Comments',
    kid: 'KID FRIENDLY',
    sexPositive: 'SEX POSITIVE',
    queer: 'QUEER INCLUSIVE',
    adult: 'ADULT ONLY',
    sober: 'SOBER ONLY',
    warnSensory: 'Warning: Sensory content',
    warnTriggering: 'Warning: Triggering'
  }
};

const warnings = [];

function clean(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function slugify(value) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return slug || 'event';
}

function toBool(value) {
  const normalized = clean(value).toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === '1';
}

function parseClock(value) {
  const match = clean(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes, total: hours * 60 + minutes };
}

function isoAt(date, minutes, addDays = 0) {
  const [year, month, day] = date.split('-').map(Number);
  const at = new Date(Date.UTC(year, month - 1, day + addDays, 0, minutes));
  const pad = (value) => String(value).padStart(2, '0');
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}T${pad(
    at.getUTCHours()
  )}:${pad(at.getUTCMinutes())}:00`;
}

function parseTime(rowNumber, day, title, startRaw, endRaw) {
  const date = CONFIG.dayToDate[day];
  const start = parseClock(startRaw);
  const end = parseClock(endRaw);

  if (!date || !start || !end) {
    warnings.push(
      `Row ${rowNumber}: timeTBD for "${title}" (${day}) because date/time could not be parsed: ${startRaw}-${endRaw}`
    );
    return {
      startsAt: date ? isoAt(date, 24 * 60 - 1) : null,
      endsAt: date ? isoAt(date, 24 * 60 - 1) : null,
      allDay: false,
      timeTBD: true,
      sortMinutes: 24 * 60 + 99
    };
  }

  const allDay =
    (start.total === 0 && end.hours === 23 && end.minutes === 59) ||
    (start.total === 0 && end.total === 0);
  if (allDay) {
    return {
      startsAt: isoAt(date, 0),
      endsAt: isoAt(date, 23 * 60 + 59),
      allDay: true,
      timeTBD: false,
      sortMinutes: 0
    };
  }

  if (end.total < start.total) {
    const duration = 24 * 60 - start.total + end.total;
    if (duration > 12 * 60) {
      warnings.push(
        `Row ${rowNumber}: timeTBD for "${title}" (${day}) because ${startRaw}-${endRaw} looks reversed or dirty`
      );
      return {
        startsAt: isoAt(date, start.total),
        endsAt: isoAt(date, start.total),
        allDay: false,
        timeTBD: true,
        sortMinutes: 24 * 60 + start.total
      };
    }

    warnings.push(`Row ${rowNumber}: midnight-crosser "${title}" (${day}) ${startRaw}-${endRaw}`);
    return {
      startsAt: isoAt(date, start.total),
      endsAt: isoAt(date, end.total, 1),
      allDay: false,
      timeTBD: false,
      sortMinutes: start.total
    };
  }

  if (end.total === start.total) {
    warnings.push(
      `Row ${rowNumber}: timeTBD for "${title}" (${day}) because start and end are identical (${startRaw})`
    );
    return {
      startsAt: isoAt(date, start.total),
      endsAt: isoAt(date, start.total),
      allDay: false,
      timeTBD: true,
      sortMinutes: 24 * 60 + start.total
    };
  }

  return {
    startsAt: isoAt(date, start.total),
    endsAt: isoAt(date, end.total),
    allDay: false,
    timeTBD: false,
    sortMinutes: start.total
  };
}

function parseLocation(rawLocation) {
  const raw = clean(rawLocation);
  const gridMatch = raw.match(/\b(?:grid square\s*)?([A-Z]\d{1,2})\b/i);
  const grid = gridMatch ? gridMatch[1].toUpperCase() : '';
  const prose = grid
    ? raw
        .replace(new RegExp(`\\bgrid square\\s*${grid}\\b\\.?`, 'i'), '')
        .replace(new RegExp(`\\b${grid}\\b\\.?`, 'i'), '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+\./g, '.')
        .trim()
    : raw;
  return { raw, grid, prose };
}

async function loadCsv() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(CONFIG.sheetUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (!text.includes('Day,Title,Start,End')) throw new Error('CSV header not recognized');
    warnings.push('Source: live Google Sheet CSV export.');
    return text;
  } catch (error) {
    warnings.push(
      `Source: program-snapshot.csv fallback because live Sheet was unreachable (${error.message}).`
    );
    return readFile(CONFIG.snapshotPath, 'utf8');
  } finally {
    clearTimeout(timeout);
  }
}

function rowValue(row, key) {
  return clean(row[CONFIG.columns[key]]);
}

function buildEvents(rows) {
  const seenIds = new Map();
  return rows
    .map((row, index) => {
      const rowNumber = index + 2;
      const day = rowValue(row, 'day');
      const title = rowValue(row, 'title');
      const start = rowValue(row, 'start');
      const end = rowValue(row, 'end');

      if (!day || !title) {
        warnings.push(`Row ${rowNumber}: skipped empty day/title.`);
        return null;
      }

      if (!CONFIG.dayToDate[day]) {
        warnings.push(`Row ${rowNumber}: unknown day "${day}" for "${title}".`);
      }

      const baseId = slugify(`${day}|${title}|${start}`);
      const collisionCount = seenIds.get(baseId) ?? 0;
      seenIds.set(baseId, collisionCount + 1);
      const id = collisionCount ? `${baseId}-${collisionCount + 1}` : baseId;
      if (collisionCount) {
        warnings.push(`Row ${rowNumber}: stable id collision on "${baseId}", appended suffix.`);
      }

      return {
        id,
        title,
        host: rowValue(row, 'host'),
        location: parseLocation(rowValue(row, 'location')),
        category: rowValue(row, 'category') || 'Uncategorized',
        vibes: rowValue(row, 'vibes'),
        day,
        dayDate: CONFIG.dayToDate[day] ?? '',
        start,
        end,
        description: rowValue(row, 'description'),
        comments: rowValue(row, 'comments'),
        flags: {
          kid: toBool(row[CONFIG.columns.kid]),
          sexPositive: toBool(row[CONFIG.columns.sexPositive]),
          queer: toBool(row[CONFIG.columns.queer]),
          adult: toBool(row[CONFIG.columns.adult]),
          sober: toBool(row[CONFIG.columns.sober]),
          warnSensory: toBool(row[CONFIG.columns.warnSensory]),
          warnTriggering: toBool(row[CONFIG.columns.warnTriggering])
        },
        ...parseTime(rowNumber, day, title, start, end)
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const date = a.dayDate.localeCompare(b.dayDate);
      if (date !== 0) return date;
      if (a.sortMinutes !== b.sortMinutes) return a.sortMinutes - b.sortMinutes;
      return a.title.localeCompare(b.title);
    });
}

function selfCheck(events) {
  assert(events.length > 1100 && events.length < 1300, `expected ~1215 records, got ${events.length}`);
  assert(events.every((event) => event.title && event.day), 'empty title/day found');
  assert(
    events.every((event) => !event.startsAt || !event.startsAt.endsWith('Z')),
    'startsAt values must be local-naive ISO strings without Z suffix'
  );
  assert(
    events.every((event) => !event.endsAt || !event.endsAt.endsWith('Z')),
    'endsAt values must be local-naive ISO strings without Z suffix'
  );

  const taklagsfest = events.find((event) => event.title === 'Taklagsfest');
  assert(taklagsfest, 'Taklagsfest self-check event missing');
  assert(
    taklagsfest.endsAt?.startsWith('2026-07-19'),
    `Taklagsfest should end next day, got ${taklagsfest.endsAt}`
  );

  const allDay = events.find((event) => event.start === '0:00' && event.end === '23:59');
  assert(allDay?.allDay, '0:00-23:59 event should be allDay');

  const dirty = events.find((event) => event.start === '12:01' && event.end === '11:59');
  assert(dirty?.timeTBD, '12:01-11:59 dirty event should be timeTBD');
}

function parseCsvFallback(csv) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => clean(value))) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => clean(value))) rows.push(row);

  const headers = rows.shift()?.map((header) => header.trimEnd()) ?? [];
  return {
    data: rows.map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
    ),
    errors: []
  };
}

async function parseCsv(csv) {
  try {
    const Papa = await import('papaparse');
    return Papa.default.parse(csv, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trimEnd()
    });
  } catch (error) {
    warnings.push(`Parser: PapaParse unavailable, used built-in RFC4180 fallback (${error.code ?? error.message}).`);
    return parseCsvFallback(csv);
  }
}

const csv = await loadCsv();
const parsed = await parseCsv(csv);

if (parsed.errors.length) {
  for (const error of parsed.errors.slice(0, 20)) {
    warnings.push(`PapaParse row ${error.row ?? '?'}: ${error.message}`);
  }
}

const events = buildEvents(parsed.data);
try {
  selfCheck(events);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

await mkdir(path.dirname(CONFIG.outputPath), { recursive: true });
await mkdir(path.dirname(CONFIG.publicOutputPath), { recursive: true });

const payload = `${JSON.stringify(events, null, 2)}\n`;
await writeFile(CONFIG.outputPath, payload);
await writeFile(CONFIG.publicOutputPath, payload);
await writeFile(
  CONFIG.warningsPath,
  [
    `${CONFIG.eventName} data build warnings`,
    `Generated: ${new Date().toISOString()}`,
    `Records: ${events.length}`,
    '',
    ...warnings
  ].join('\n') + '\n'
);

console.log(`Built ${events.length} events -> ${CONFIG.outputPath}`);
console.log('Self-check: startsAt/endsAt values contain no Z suffix');
console.log(`Warnings -> ${CONFIG.warningsPath}`);
