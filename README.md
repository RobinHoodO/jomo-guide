# Jomo Guide 🎲

**An open-source gift to the Borderland community.**

An unofficial, offline-first companion app for **The Borderland 2026** program —
all 1,215 events from the official [JOMO Guide](https://drive.google.com/drive/folders/1xGbIFoSErGewnilE8NRxGbcP4LWq94ND)
in your pocket, working with **zero signal on the playa**.

**Live app:** https://jomo-guide.vercel.app — open it on your phone, tap
*Add to Home Screen*, and it works offline from then on. Your starred events
stay on your phone; nothing is sent anywhere.

## What it does

- **Program** — browse all events by day, time of day, category, and vibe
  (kid-friendly / sober / queer-inclusive / sex-positive / adults-only), with
  warnings always visible. Family mode one tap away.
- **Serendipity** — one good maybe at a time. Reshuffle the dice instead of
  doomscrolling 1,215 things.
- **Now / Next** — what's happening right now and starting soon.
- **My Schedule** — star events (recurring ones per-day), see clashes framed
  the JOMO way: *pick one, skip the rest*. A light day is a spacious day 🌾
- **Map** — the official grid map with event counts per square, plazas,
  buildings & facilities views, blinking square lookup from any event, and
  GPS *you-are-here* (works offline — GPS needs no signal).
- **Info** — the guide's front matter: emergency reference, principles,
  consent culture, ticks, gate hours, nature rules, trash sorting.

Everything is stored **locally on your phone**. The app checks for program
updates when online and refreshes itself — your stars always survive updates.

## For the community 🖤

This is a gift, in the spirit of the 11 principles. The official printed
JOMO Guide (and the artwork this app borrows its soul from) lives here:
[JOMO Guide 2026 — original files](https://drive.google.com/drive/folders/1xGbIFoSErGewnilE8NRxGbcP4LWq94ND).

**Want to build this out or evolve it — for 2027, for your own burn, for
something weirder? Let's talk.** Open an issue, fork it, or find Robin on
the playa. PRs welcome.

## Tech

Vite + React + TypeScript + Tailwind CSS 4 + `vite-plugin-pwa`. No backend,
no accounts, no tracking. The program is baked in at build time from the
community spreadsheet.

```bash
npm install
node scripts/build-events.mjs   # refresh events.json from the Google Sheet
npm run dev                     # http://localhost:5174
npm run build
```

`build-events.mjs` tries the public Google Sheet CSV export, falls back to
`program-snapshot.csv` when offline, and emits `src/data/events.json` plus
`data-warnings.txt` for rows that needed cleaning.

## Next year

Everything year-specific lives in the config block at the top of
`scripts/build-events.mjs` (event year, Sheet CSV URL, `dayToDate` map,
column names) plus the map assets in `public/`. Swap those, rebuild, done.

## License

MIT — see [LICENSE](LICENSE). Unofficial companion, made by a burner.
Not affiliated with The Borderland organisation.
