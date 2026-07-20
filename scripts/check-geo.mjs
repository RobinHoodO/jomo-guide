// Self-check for src/lib/geo.ts against the official Borderland map georeference
// (github.com/theborderland/map, apps/map/src/utils/gridUtils.ts).
// Run: node --experimental-strip-types scripts/check-geo.mjs
import assert from 'node:assert';
import { latLonToGrid, ANCHOR } from '../src/lib/geo.ts';

const near = (a, b, tol = 0.05) => Math.abs(a - b) < tol; // 0.05 cells = 2.5 m

// Grid origin = NW corner of cell A01.
const origin = latLonToGrid(ANCHOR.lat, ANCHOR.lon);
assert(near(origin.col, 0) && near(origin.row, 0), `origin -> ${JSON.stringify(origin)}`);

// Reference point computed with the official Web Mercator transform.
const p = latLonToGrid(57.62188, 14.92604);
assert(near(p.col, 11.15) && near(p.row, 18.37), `ref point -> ${JSON.stringify(p)}`);

console.log('geo self-check OK');
