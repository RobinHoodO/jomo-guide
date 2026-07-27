// Usage: node scripts/secret-cell-hash.mjs <CELL_CODE> — put the output in VITE_SECRET_CELL_HASH /
// VITE_PRESENCE_CELL_HASH in Vercel and .env.local; never commit the plaintext cell.
//
// Accepts padded or unpadded input (B3 and B03 are the same cell) and hashes the canonical
// unpadded form. This MUST stay identical to canonicalCell() in src/lib/geo.ts — if the two
// ever disagree the door silently never opens, which no build or typecheck can catch.
import { createHash } from 'node:crypto';

function canonicalCell(code) {
  const match = /^([A-Z]+)0*(\d+)$/.exec(String(code).trim().toUpperCase());
  if (!match) return null;

  const row = Number(match[2]);
  if (!Number.isFinite(row) || row < 1) return null;

  return `${match[1]}${row}`;
}

const cellCode = canonicalCell(process.argv[2] ?? '');

if (!cellCode) {
  console.error('Usage: node scripts/secret-cell-hash.mjs <CELL_CODE>   e.g. B3 or B03');
  process.exitCode = 1;
} else {
  process.stdout.write(`${createHash('sha256').update(cellCode).digest('hex')}\n`);
}
