// Reconcile the source program sheet against the app's events.json, 1:1.
// Answers: "is the app missing events that exist in the sheet?"
// Reproduces build-events.mjs's exact row->id logic so ids line up with events.json.
//
// Usage:
//   node scripts/reconcile-events.mjs           # live Google Sheet (fallback: program-snapshot.csv)
//   node scripts/reconcile-events.mjs --snapshot # force the local snapshot
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1lQycr19AhDhuU2h5LjFb6kkgraafageu2VBnalK-bto/export?format=csv&gid=1641296636';
const SNAPSHOT = 'program-snapshot.csv';
const EVENTS_JSON = 'src/data/events.json';
const REPORT = 'data/reconciliation-report.txt';
const COLS = { day: 'Day', title: 'Title', start: 'Start' };

const forceSnapshot = process.argv.includes('--snapshot');

// --- identical helpers to build-events.mjs ---
const clean = (v) =>
  String(v ?? '').replace(/\r\n/g, '\n').replace(/ /g, ' ').trim();

function slugify(value) {
  const slug = value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return slug || 'event';
}

async function parseCsv(csv) {
  const Papa = await import('papaparse');
  return Papa.default.parse(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trimEnd()
  }).data;
}

async function loadSource() {
  if (forceSnapshot) {
    return { label: 'local snapshot (forced)', csv: await readFile(SNAPSHOT, 'utf8') };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(SHEET_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    if (!csv.includes('Day,Title,Start,End')) throw new Error('unexpected CSV header');
    return { label: 'live Google Sheet', csv };
  } catch (err) {
    const csv = await readFile(SNAPSHOT, 'utf8');
    return { label: `local snapshot (live sheet unreachable: ${err.message})`, csv };
  }
}

// Rebuild the id set the way build-events.mjs would, in source row order.
function buildSourceIndex(rows) {
  const seen = new Map();
  const eventRows = [];
  let blankSkipped = 0;
  rows.forEach((row, i) => {
    const day = clean(row[COLS.day]);
    const title = clean(row[COLS.title]);
    const start = clean(row[COLS.start]);
    if (!day || !title) {
      blankSkipped += 1;
      return;
    }
    const baseId = slugify(`${day}|${title}|${start}`);
    const n = seen.get(baseId) ?? 0;
    seen.set(baseId, n + 1);
    const id = n ? `${baseId}-${n + 1}` : baseId;
    eventRows.push({ id, day, title, start, sheetRow: i + 2 });
  });
  return { eventRows, blankSkipped };
}

const source = await loadSource();
const rows = await parseCsv(source.csv);
const { eventRows, blankSkipped } = buildSourceIndex(rows);

const events = JSON.parse(await readFile(EVENTS_JSON, 'utf8'));
const appList = Array.isArray(events) ? events : events.events;
const appIds = new Set(appList.map((e) => e.id));
const sourceIds = new Set(eventRows.map((e) => e.id));

const missing = eventRows.filter((e) => !appIds.has(e.id)); // in sheet, not in app
const orphan = appList.filter((e) => !sourceIds.has(e.id)); // in app, not in sheet

const lines = [];
const say = (s = '') => { lines.push(s); console.log(s); };

say('JOMO event reconciliation — sheet vs app');
say(`Source: ${source.label}`);
say(`events.json: ${EVENTS_JSON}`);
say('');
say(`Total source rows parsed:       ${rows.length}`);
say(`  blank day/title (skipped):    ${blankSkipped}`);
say(`  real event rows:              ${eventRows.length}`);
say(`  unique event ids in source:   ${sourceIds.size}  (dupes collapsed by day|title|start suffixing: ${eventRows.length - sourceIds.size})`);
say(`App events (events.json):       ${appList.length}`);
say('');
say(`MISSING from app (in sheet, no matching app event): ${missing.length}`);
say(`ORPHAN in app (no matching source row):             ${orphan.length}`);
say('');

if (missing.length) {
  say('--- MISSING (sheet row -> would-be id) ---');
  missing.slice(0, 500).forEach((m) =>
    say(`  sheetRow ${m.sheetRow} | ${m.day} | ${m.start} | ${m.title}  [${m.id}]`)
  );
  if (missing.length > 500) say(`  ...and ${missing.length - 500} more`);
  say('');
}
if (orphan.length) {
  say('--- ORPHAN (in app, not in current source) ---');
  orphan.slice(0, 200).forEach((o) =>
    say(`  ${o.day} | ${o.start} | ${o.title}  [${o.id}]`)
  );
  if (orphan.length > 200) say(`  ...and ${orphan.length - 200} more`);
  say('');
}

const verdict = missing.length === 0
  ? 'VERDICT: app contains every event in the source. Nothing missing.'
  : `VERDICT: app is missing ${missing.length} source events (${((missing.length / eventRows.length) * 100).toFixed(1)}% of the sheet).`;
say(verdict);

await writeFile(REPORT, lines.join('\n') + '\n').catch(() => {});
