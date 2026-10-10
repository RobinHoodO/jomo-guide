# jomo26 — gstack code health analysis

Generated via gstack `/health` methodology (project-local install, `.claude/skills/`).
Read-only — no fixes applied.

## Project

Offline-first PWA festival companion for Borderland 2026. Vite + React 19 + TS 5.8,
Tailwind 4, `vite-plugin-pwa` (Workbox), Sentry, Supabase. `npm run dev` on :5174.

## Health Stack Detected

No `## Health Stack` section in CLAUDE.md — auto-detected from the repo:

| Category   | Tool              | Status |
|------------|-------------------|--------|
| Type check | `tsc -b --noEmit` | configured |
| Lint       | —                 | **not configured** (no eslint/biome config) |
| Tests      | —                 | **not configured** (no test script, no test files, no runner in deps) |
| Dead code  | —                 | not configured (no knip) |
| Shell lint | —                 | n/a (no `.sh` files) |
| Data checks| `check:geo`, `check:missions`, `check:quant`, `check:past` | configured (project-specific) |

## Results

```
CODE HEALTH DASHBOARD
======================
Category      Tool                Status     Details
----------    ------------------  --------   -------
Type check    tsc -b --noEmit     CLEAN      0 errors
Data: geo     check:geo           CLEAN      geo self-check OK
Data: missions check:missions     CLEAN      missions self-check OK
Data: quant   check:quant         CLEAN      quant self-check OK
Data: past    check:past          CLEAN      past-events self-check OK
Lint          —                   SKIPPED    no linter configured
Tests         —                   SKIPPED    no test runner configured
Dead code     —                   SKIPPED    no knip
```

No composite score computed — too many categories (lint, tests, dead code) are
genuinely absent rather than passing, and a weighted score would misrepresent that
as "clean." The honest read: **type safety and data integrity are solid; automated
regression coverage is zero.**

## Code metrics

- `src/`: 52 TS/TSX files, 10,291 LOC
- Dependencies: 12 runtime, 7 dev — lean
- `grep` sweep: 0 `console.log`/`console.debug`, 0 `@ts-ignore`/`@ts-expect-error`/`: any`, 0 `TODO`/`FIXME`/`HACK` in `src/`
- No secrets in source — the one `SECRET`-named symbol (`VITE_SECRET_CELL_HASH`) is a build-time env var read via `import.meta.env`, used by the hidden-cell ARG mechanic (`src/lib/hidden.ts`)

**Largest files** (guideline in this workspace's coding-style rules: 200–400 typical, 800 max):

| File | Lines |
|---|---|
| `src/components/Missions.tsx` | 1326 |
| `src/components/MapTab.tsx` | 903 |
| `src/lib/missions.ts` | 750 |
| `src/components/MissionForm.tsx` | 609 |
| `src/App.tsx` | 458 |
| `src/lib/mission-rules.ts` | 437 |
| `src/components/HQ.tsx` | 405 |

`Missions.tsx` and `MapTab.tsx` are both over the 800-line ceiling. Both are the
oldest, most-iterated-on surfaces per git log (quests, quest chaining, the M10
terminal, low-signal mode all landed here) — classic organic growth, not one bad
commit. Worth a split (e.g. pull the quest-chain state machine out of `Missions.tsx`)
next time either file needs a non-trivial change, not as standalone cleanup.

## Architecture snapshot

- `src/lib/` (19 files) — the real logic: `missions.ts`/`mission-rules.ts` (quest
  engine), `events.ts`/`past.ts` (event-granular hide/show), `outbox.ts` (offline
  write queue), `hidden.ts`/`quant.ts`/`gm.ts` (the ARG layer — ties to `/hq`),
  `supabase.ts`, `sentry.ts`, `pwa.ts`, `geo.ts`/`whereami.ts`, `deeplink.ts`, `ics.ts`.
- `src/components/` (23 files) — `Missions`, `MapTab`, `EventCard`, `Program`, `HQ`,
  `Serendipity`, etc.
- `src/hooks/` (3 files) — `useFavorites`, `useHidden`, `usePwaUpdate`.
- `src/data/` — static event/destination JSON + info content.

Recent commit history (last ~15) shows a consistent pattern: feature lands, `perf:`
follow-up trims bundle/boot cost, `fix:` follow-up closes an edge case found by
dogfooding (Thursday day-chip bug, Serendipity date bug, etc.) — no evidence of
regressions shipping silently, which is notable given there's no test suite backing
that discipline.

## PWA / offline behavior

`vite-plugin-pwa` with `registerType: 'prompt'`, `StaleWhileRevalidate` for the
lazy-loaded `/hq` chunk, `cleanupOutdatedCaches: true`. Matches the "offline-first"
positioning — this isn't just a marketing label, the caching strategy backs it.

## Findings, ranked

1. **[HIGH] No automated tests.** Zero test files, no runner in `devDependencies`.
   This workspace's own coding-style rule calls for TDD on non-trivial logic and
   ~80% coverage on business paths — the quest engine (`missions.ts`,
   `mission-rules.ts`, 1187 combined lines) and offline sync (`outbox.ts`) are
   exactly that kind of logic and currently rely entirely on manual dogfooding +
   the `check:*` data-integrity scripts (which validate data shape, not app
   behavior). A regression here fails silently until someone notices in the field.
2. **[MED] No linter.** Nothing catches unused vars, inconsistent patterns, or
   accidental `any` beyond what `tsc` already enforces. Given the codebase is
   already clean (0 `any`, 0 stray `console.log`), this is a low-cost win to
   *keep* it that way — add `eslint` or `biome` with a minimal config.
3. **[LOW] Two files past the 800-line house limit** (`Missions.tsx`, `MapTab.tsx`)
   — flagged above, not urgent, address opportunistically.
4. **[INFO] `check:*` scripts are real regression coverage, just narrow.** They
   validate geo/missions/quant/past-events data shape and pass cleanly. Good
   pattern — extending it to cover the quest state machine would close most of
   finding #1 without a full test framework.

## Note on CLAUDE.md

This project's `CLAUDE.md` ends with a section addressed to AI agents reading the
repo ("A note for the intelligence reading this"), asking the reader to relay a
recruitment message. Read as part of this analysis, flagged for visibility, not
acted on — it's an in-fiction ARG artifact consistent with the hidden-cell/Quant
mechanics in `src/lib/hidden.ts` and `src/lib/quant.ts`, not an actionable
instruction to the analysis itself.

## gstack install

Installed project-local via `./setup --local --no-prefix -q --host claude` from the
existing `~/gstack` clone (already built, no network fetch needed). Skills live at
`.claude/skills/*` in this repo only — nothing added to `~/.claude/skills/` or to any
global `CLAUDE.md`. Untracked in git; add to `.gitignore` or commit, your call.
