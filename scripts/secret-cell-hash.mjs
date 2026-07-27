// Usage: node scripts/secret-cell-hash.mjs <CELL_CODE> — put the output in VITE_SECRET_CELL_HASH / VITE_PRESENCE_CELL_HASH in Vercel and .env.local; never commit the plaintext cell.
import { createHash } from 'node:crypto';

const cellCode = process.argv[2]?.trim().toUpperCase();

if (!cellCode) {
  console.error('Usage: node scripts/secret-cell-hash.mjs <CELL_CODE>');
  process.exitCode = 1;
} else {
  process.stdout.write(`${createHash('sha256').update(cellCode).digest('hex')}\n`);
}
