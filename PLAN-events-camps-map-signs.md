# Plan: Event↔camp links + map alignment + signs/symbols polish

## Context

Several related improvements to the JOMO Guide app (`projects/jomo26`) requested in one session. The through-line: make the app's data connect and read the way the printed guide does. Grouped into five independent changes, shippable together.

---

## A. Link events ↔ camps bidirectionally (the main request)

**Why:** Program/Schedule events and the Camps tab are separate; the user wants to open a camp and see its events, and open an event and jump to its host camp.

**Data reality (measured):** `event.host` is free text (`Person Name / Camp Name`, 77% carry a delimiter). Only join surface is `host` text vs `Destination.title`. **Decision (user):** precision over coverage — link only confident matches, leave the rest unlinked (they still have their map-grid link).

**Approach:**
- **New `src/lib/links.ts`**, computed once at module load:
  - `normalize(s)` — lowercase, NFKD, strip combining marks/emoji/punctuation, collapse whitespace (mirror `normalizeNeighborhoodText` at `events.ts:181`).
  - `TITLE_INDEX: Map<normTitle, Destination>` from `DESTINATIONS`.
  - `resolveCamp(event)`: (1) whole-host exact hit; else (2) split host on `/ | @ ,` and `" at "`, exact-match the **last** segment then any segment. **No fuzzy/substring step** (keeps it "pretty certain"). Returns `Destination | null`.
  - Memoized `EVENT_TO_CAMP` and reverse `CAMP_TO_EVENTS` maps; export `campForEvent(event)` and `eventsForCamp(campId)`. (~640–660 events linked, ~83 camps.)
- **`src/App.tsx`** — mirror the existing `selectGrid` pattern (`:38-51`): add `selectedCampId` + `selectCamp(campId)` (`setTab('camps')` + scroll to new `id="camps-tab"`); thread `onSelectCamp` into Program, Schedule, Destinations; pass `selectedCampId` + favorites + `onSelectGrid` into Destinations.
- **`src/components/EventCard.tsx`** — add `onSelectCamp?` prop; at the host line (`:147`), if `campForEvent(event)` resolves, render a tappable camp chip (`🏕 {camp.title}`) → `onSelectCamp(camp.id)`; else keep plain host text.
- **`src/components/Program.tsx` / `Schedule.tsx`** — forward `onSelectCamp` to EventCard.
- **`src/components/Destinations.tsx`** — accept `onSelectCamp`, `onSelectGrid`, `isFavorite`, `toggleFavorite`, `selectedCampId`; in the expanded camp block (`:56-69`) render `eventsForCamp(id)` **inline as reused `<EventCard>`s** under an "Events here (N)" heading; auto-expand + scroll the card when `selectedCampId === id`.
- **`src/styles.css`** — `.camp-chip` (reuse `.recurring-chip`/`.grid-badge` look).

---

## B. Map: overlay numbers/markers align 100% with the artwork

**Why:** With map art shown, the app's overlaid grid-axis numbers and plaza/place markers sit slightly off from the official artwork's own printed numbers/bubbles, so they read as doubled and misaligned.

**Mechanism:** `MapTab.tsx:315-324` draws `/map-official.png` as an SVG `<image>` stretched (`preserveAspectRatio="none"`) to `x=LEFT_AXIS, y=TOP_AXIS, width=GRID_WIDTH, height=GRID_HEIGHT`. Markers use `markerPosition()` (`:69-79`) off the same grid. Misalignment = the artwork crop's grid doesn't map 1:1 onto the overlay grid (a near-uniform offset/scale), and/or a few `PLAZAS`/`PLACES` grid coords in `info-content.ts` are a cell off.

**Approach (visual calibration — iterate with screenshots):**
1. Run local `vite preview` + Playwright; screenshot Map with art on, in Plazas and Places views. (Live-site browser calls failed this session; do this against local preview during implementation.)
2. If it's a uniform shift → add small x/y (and if needed width/height) offset constants to the `<image>` placement in `MapTab.tsx` so the artwork's printed grid lines land on the overlay grid. Expose them as named calibration constants (like the GPS knobs already in `src/lib/geo.ts`).
3. If specific plazas/places are individually off → nudge those `grid` values (or add per-marker pixel offsets) in `src/data/info-content.ts` (`PLAZAS`/`PLACES`).
4. Iterate until app markers sit exactly on the artwork bubbles. Consider dimming/hiding the app's own axis numbers when art is shown if the artwork already prints them (avoids the "double number" look).

---

## C. Fix the confusing "Open the tiny portal" button

**Why (user question):** On an expanded event card, a button labeled "Open the tiny portal" appears but only **closes** the card — it's a mislabel. `EventCard.tsx:138-145`: the collapse button (`onClick={setIsExpanded(false)}`) reuses the open-action label `compact ? 'Peek' : 'Open the tiny portal'`.

**Fix:** Relabel the collapse button to a clear "Close" (e.g. `Close ▴`). Keep the title-button tooltip flavor text as-is. One-line change.

---

## D. Signs & instructions: colour-coded categories + full symbol list

**Why:** The guide's signs page (their "page 6" = the JOMO SIGNS page) shows event/camp categories as **colour-coded pills** and lists inclusivity **symbols**; the app's Info "Signs & instructions" section currently renders them as plain text.

**Approach — `src/components/InfoTab.tsx` + `src/data/info-content.ts`:**
- Render the category lists as coloured chips using `CATEGORY_COLORS` (`events.ts:79`) and `DEST_CATEGORY_COLORS` (`destinations.ts`), reusing the `.category-chip` style, so each category shows in its guide colour.
- Add the **full verbatim symbol list** with each emoji + meaning:
  - **Event icons:** 🐒 Kids friendly · 🦍 Adults only · 🖤 Sex positive · 😇 Sober · 💥 Sensory content · 🚨 Triggering themes · 🌈 Queer-inclusive · 🌈🌈 Queer-focused.
  - **Camp/dream icons:** 👥 capacity · 😇 Sober · 🐒 Kid friendly · 🦍 Adults only · 🍑 Body-positive · 🖤 Sex positive · 🌈 Queer inclusion · 🐩 Pet-friendly · 🚨 Triggering themes · 💥 Sensory content.
  - (Keeps the verbatim text; adds the actual glyphs beside each meaning.)

---

## E. Use the guide's inclusivity emoji on events

**Why:** Events should show the same symbols the guide uses, so flags are easy to spot (camps already display emoji via their sheet `tags`).

**Approach — `src/lib/events.ts` + `EventCard.tsx` + `FilterBar.tsx`:**
- Add an `icon` emoji to each `FLAG_FILTERS` entry (`events.ts:134`): kid `🐒`, adult `🦍`, sexPositive `🖤`, sober `😇`, queer `🌈`, warnSensory `💥`, warnTriggering `🚨`.
- In `EventCard` where flags/warnings render (the `soft-badge`/`warning-badge` block ~`:149-160`), prefix each badge with its emoji (or show emoji + short label).
- Optionally show the emoji in the FilterBar flag chips too, for consistency.

---

## Files touched (summary)
- New: `src/lib/links.ts`
- `src/App.tsx`, `src/components/EventCard.tsx`, `src/components/Program.tsx`, `src/components/Schedule.tsx`, `src/components/Destinations.tsx`, `src/components/InfoTab.tsx`, `src/components/FilterBar.tsx`
- `src/lib/events.ts` (flag emoji), `src/data/info-content.ts` (signs colours/symbols; maybe plaza/place nudges), `src/components/MapTab.tsx` (image calibration), `src/styles.css`
- No build-script or data-file regeneration required.

## Verification
1. `npm run build` (tsc + vite) passes.
2. `npx vite preview` + Playwright (local), mobile viewport:
   - **A:** expand an event whose host resolves (segment e.g. `…/ Java the hut`, or whole `Wild Sacred Fire`) → camp chip → tap → Camps opens that camp expanded with its events inline; expand an inline event → its host chip → returns to the right camp. A person-only host (e.g. `JazzPrr`) shows **no** chip.
   - **B:** Map with art on → app markers/axis numbers overlap the artwork's printed bubbles exactly in Plazas + Places views.
   - **C:** expanded event card's close button reads "Close" and collapses.
   - **D:** Signs section shows coloured category chips + the full emoji symbol legend.
   - **E:** events display 🐒/🦍/🖤/😇/🌈/💥/🚨 for their flags.
3. Commit + push (auto-deploys to https://jomo-guide.vercel.app); confirm Vercel build goes Ready.
