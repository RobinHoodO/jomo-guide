# Jomo26 — Borderland 2026 offline program companion

## Context

The spreadsheet is the **Borderland 2026** program: **1,215 events** across Jul 18–27,
2026 (multiline descriptions inflated the raw line count). Columns: `Day, Title,
Start, End, Facilitator/Host camp, Location (grid square + prose), Category, Vibes,
Description, Comments`, plus boolean flags `KID FRIENDLY, SEX POSITIVE, QUEER
INCLUSIVE, ADULT ONLY, SOBER ONLY, Warning: Sensory, Warning: Triggering`.
12 categories (Workshop/Class biggest at 314). Recurring events are **already
expanded** — each occurrence is its own row; every row is unique by
`day+title+start` (verified, 0 collisions). Times can cross midnight (20:00→3:00),
be all-day (0:00→23:59 / 0:00→0:00), or be dirty (12:01→11:59).

Robin wants a **super-simple, fun app** — for himself and anyone — that cuts the
1,200-event firehose down to the few things you'll actually attend. Name = *Jomo*
(Joy Of Missing Out): missing out should feel *good*, not anxious. **No signal on
the playa**, so it must work fully offline and keep picks on the user's own phone.

### Decisions (locked via grilling)
- **Utility core + JOMO seasoning** — a genuinely useful browser, with a few touches that make *doing less* feel like the win.
- **Platform:** installable **PWA**. One URL → "Add to Home Screen" → offline after first load. No native/app-store, no accounts, no backend.
- **Distribution:** deployed to **Vercel**, **open-sourced on GitHub** (MIT, real README, humble "unofficial companion, made by a burner" note). Sheet's CSV export is already public/no-auth — nothing secret leaks.
- **Data:** fetched from the Sheet **at build time** → `events.json` baked in. Refresh = **Robin redeploys manually**. No live-fetch.
- **Reuse:** one-off but **tidy** — event year/dates/sheet-URL/column-map in one obvious config block so 2027 is a two-line edit. No config *engine* (YAGNI).
- **Design:** **calm-minimal base + playful microcopy.** Whitespace, one warm accent, strong type, **dark default** (night use). Fun rides in words + vibe emojis, not visuals or heavy animation.
- **Locations:** **text-only in v1**; grid code rendered as a scannable `P12` badge + prose kept. Interactive map → roadmap.
- **Vibe flags:** neutral-but-powerful filters, **nothing hidden by default**; warnings always shown as visible badges; one **off-by-default "family mode"** convenience toggle (kid-friendly + sober, hides adult/triggering). Filters AND across flags, OR within category group.
- **Dirty data:** **show every event**, degrade junk fields gracefully, auto-clean what's safely cleanable, and emit a build-time warnings log; build fails loudly only if the *whole* parse collapses (shifted columns), never on a single bad cell.

## Features (v1)
1. **Serendipity pick** (signature) — one random event card at top; **🎲 reshuffle**; one-tap star. Weighted **~70% happening now/soon, ~30% any day**; **respects active filters**; fresh roll each tap; off-event it gracefully rolls across all days.
2. **Now / Next** strip — from `new Date()`, "happening now" + "starting soon"; `?now=<ISO>` override for testing; off-event falls back to first program day.
3. **Program** — events grouped by day (day pills), sticky search (title/host/location/description), category + vibe filter chips + family-mode toggle. Compact cards, tap to expand, star to favorite.
4. **My Schedule** — favorites only, time-sorted, grouped by day. **JOMO framing:** a light day reads "A spacious day 🌾"; overlaps read "pick one, skip the rest" (not "⚠ conflict"). Cancelled-but-starred events shown **greyed** ("removed from program"), never silently dropped.
5. **Missing-out counter** — a quiet line: "You're happily missing 1,203 other things" (total − stars).

## Approach

Standalone **Vite + React + TS + Tailwind** app on **Vercel**. Vite over Next.js
purely because `vite-plugin-pwa` (Workbox) gives a rock-solid offline/install story
in ~10 lines — the one thing this app must not get wrong. 100% client-side.
New project at `projects/jomo26/`, registered in `projects.json`, Vite dev on
**port 5174** (5173 = worldmonitor).

### Build-time data pipeline
- `scripts/build-events.mjs`: fetch CSV export
  `https://docs.google.com/spreadsheets/d/1lQycr19AhDhuU2h5LjFb6kkgraafageu2VBnalK-bto/export?format=csv&gid=1641296636`,
  parse with **papaparse** (descriptions contain commas + newlines + quotes — never hand-split), emit `src/data/events.json` + `data-warnings.txt`.
- Per row → clean record: **stable `id`** = slug of `day|title|start` (verified unique), `title, host, location{grid, prose}, category, day, start, end, description, comments`, `flags{kid, sexPositive, queer, adult, sober, warnSensory, warnTriggering}`, computed `startsAt`/`endsAt` (ISO; `"Sat. 18 July"`→2026 date; `end<start`⇒next day; `0:00–23:59`/`0:00–0:00`⇒`allDay`; reversed/nonsense⇒`timeTBD`, sorts last).
- Auto-clean: trim whitespace, normalize the grid code out of the location prose into `location.grid`, coerce flag strings to booleans, flag anomalies to the warnings log.
- Config block at top (event name, year, day→date map, sheet URL, column names) for next-year reuse. Commit a `events.json` snapshot so the app builds even if the Sheet is unreachable.

### State & offline
- Favorites = `localStorage` array of event `id`s via one `useFavorites()` hook. That's the whole "database." Stable ids ⇒ redeploys don't orphan stars.
- `vite-plugin-pwa` (`registerType:'autoUpdate'`, Workbox precache of app shell + `events.json`) + web manifest (name, icons, theme). Installable + opens offline.

## Critical files
- `projects/jomo26/scripts/build-events.mjs` — Sheet → `events.json` + warnings (papaparse, config block).
- `projects/jomo26/src/data/events.json` — generated, committed snapshot.
- `projects/jomo26/src/lib/events.ts` — types + day/time parsing + clash helper + serendipity weighting.
- `projects/jomo26/src/hooks/useFavorites.ts` — localStorage favorites.
- `projects/jomo26/src/components/` — `Serendipity`, `NowNext`, `FilterBar`, `EventCard`, `Program`, `Schedule`, `MissingOutCounter`.
- `projects/jomo26/src/App.tsx` — tab shell (Program / My Schedule).
- `projects/jomo26/vite.config.ts` — React + `vite-plugin-pwa`.
- `projects/jomo26/{README.md, LICENSE, ROADMAP.md}` — MIT, unofficial note, deferred items.
- Root `projects.json` — register `jomo26` (path, dev cmd, port 5174, Vercel target).

## Dependencies
`react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `tailwindcss@4`,
`vite-plugin-pwa`; `papaparse` (dev/build only). Nothing else.

## ROADMAP.md (deferred, not v1)
- **Interactive playa map** — parse grid → pins (biggest single chunk; needs map asset rights + real coordinate system).
- **"One good thing per day"** — nudge to pick a single daily anchor, treat that as success.
- Favorites export/backup (share/restore your schedule).
- Live/auto data refresh (only if the program shifts mid-event).
- Next-year re-point checklist.

## Verification (end-to-end)
1. `node scripts/build-events.mjs` → assert **~1,215** records, no empty `title`/`day`, midnight-crossers (Taklagsfest 20:00→3:00) have `endsAt` next day, `0:00–23:59` flagged `allDay`, `12:01→11:59` flagged `timeTBD`. `data-warnings.txt` lists the dirty rows. (One `assert` self-check in the script.)
2. `npm run dev` → search "yoga", toggle a category + a vibe chip, flip family mode; confirm the list narrows (AND across flags).
3. Serendipity: tap 🎲 a few times → different events, all obeying active filters; star one from the card.
4. Star 3 events (two overlapping) → My Schedule shows them time-sorted, the overlapping pair framed as "pick one," and a light day reads "spacious." Missing-out counter = 1215 − stars.
5. `?now=2026-07-20T11:15:00` → Now/Next shows correct live/upcoming events.
6. `npm run build && npm run preview` → DevTools **Offline**, reload: app + program still load. Lighthouse → **Installable** PWA passes.
7. Deploy to Vercel; on a phone: Add to Home Screen, airplane mode, confirm it opens and favorites persist across reloads.
