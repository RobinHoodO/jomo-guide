# Jomo26

Jomo26 is an unofficial offline companion for the Borderland 2026 program. It is a small installable PWA for finding a few events worth attending, starring them locally, and feeling good about missing the rest.

Made by a burner, not by Borderland. No accounts, no backend, no tracking; favorites live in `localStorage` on the device.

## Use

Open the deployed site once, then use your browser's "Add to Home Screen" option. After the first load, the app shell and program data are cached for offline use.

## Development

```bash
npm install
node scripts/build-events.mjs
npm run dev
```

The dev server runs on port `5174`.

## Rebuild Program Data

```bash
node scripts/build-events.mjs
```

The script tries the public Google Sheet CSV export from `SPEC.md`, then falls back to `program-snapshot.csv` when offline or unreachable. It emits:

- `src/data/events.json`
- `public/events.json`
- `data-warnings.txt`

## Next Year

For 2027, edit the config block at the top of `scripts/build-events.mjs`: update the event year, Sheet CSV URL, and `dayToDate` map. If the Sheet column names change, update the `columns` map in the same block.

## License

MIT. See `LICENSE`.
