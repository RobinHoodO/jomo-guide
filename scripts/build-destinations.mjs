import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import Papa from 'papaparse';

// Destinations (camps & dreams) tab of the same Borderland 2026 sheet.
const CONFIG = {
  sheetUrl:
    'https://docs.google.com/spreadsheets/d/1lQycr19AhDhuU2h5LjFb6kkgraafageu2VBnalK-bto/export?format=csv&gid=1926215512',
  snapshotPath: 'destinations-snapshot.csv',
  outputPath: 'src/data/destinations.json',
  publicOutputPath: 'public/destinations.json',
};

function clean(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/ /g, ' ')
    .trim();
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// Same grid extraction as build-events.mjs, so camps land on the same map grid.
function parseLocation(rawLocation) {
  const raw = clean(rawLocation);
  const gridMatch = raw.match(/\b(?:grid square\s*)?([A-Z]\d{1,2})\b/i);
  const grid = gridMatch ? gridMatch[1].toUpperCase() : '';
  const prose = grid
    ? raw
        .replace(new RegExp(`\\bgrid square\\s*${grid}\\b\\.?`, 'i'), '')
        .replace(new RegExp(`\\b${grid}\\b\\.?`, 'i'), '')
        .replace(/\s{2,}/g, ' ')
        .replace(/^[,\s.]+|[,\s]+$/g, '')
        .trim()
    : raw;
  return { raw, grid, prose };
}

async function loadCsv() {
  try {
    const response = await fetch(CONFIG.sheetUrl);
    if (!response.ok) throw new Error(`sheet fetch ${response.status}`);
    const text = await response.text();
    await writeFile(CONFIG.snapshotPath, text, 'utf8');
    console.log('Fetched destinations from the live sheet.');
    return text;
  } catch (error) {
    console.warn(`Live sheet unavailable (${error.message}); using snapshot.`);
    return readFile(CONFIG.snapshotPath, 'utf8');
  }
}

async function main() {
  const csv = await loadCsv();
  const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });

  const seen = new Set();
  const destinations = data
    .map((row) => {
      const title = clean(row.Title);
      if (!title) return null;
      let id = slugify(title) || 'destination';
      let n = 2;
      while (seen.has(id)) id = `${slugify(title)}-${n++}`;
      seen.add(id);
      return {
        id,
        title,
        category: clean(row.Category),
        tags: clean(row.Tags),
        location: parseLocation(row.Location),
        description: clean(row.Description),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.title.localeCompare(b.title));

  assert.ok(destinations.length > 250, `expected 250+ destinations, got ${destinations.length}`);
  assert.equal(new Set(destinations.map((d) => d.id)).size, destinations.length, 'ids must be unique');

  const json = `${JSON.stringify(destinations, null, 2)}\n`;
  await writeFile(CONFIG.outputPath, json, 'utf8');
  await writeFile(CONFIG.publicOutputPath, json, 'utf8');

  const withGrid = destinations.filter((d) => d.location.grid).length;
  console.log(`Wrote ${destinations.length} destinations (${withGrid} placed on the grid).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
