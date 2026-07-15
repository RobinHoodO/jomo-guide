# Preflight — 2026-07-15 (Borderland starts Sat Jul 18)

Pre-event hardening pass on the JOMO Guide PWA. **Nothing was deployed** — 4 fix
commits sit on local `main`, ready to push when you approve.

## Verified working

- **Build + typecheck**: `npm run build` (tsc + vite) green. Note: it was
  **broken at HEAD** (missing `Place` type import in MapTab) — Vercel never
  noticed because `vercel.json` builds with `npx vite build` only, skipping tsc.
- **Event data** (read-only audit, no regeneration): 1,217 events, all ids
  unique, every `dayDate` inside 2026-07-18…27, zero unparseable timestamps,
  zero end-before-start, 107 midnight-crossers correctly rolled to next day,
  34 all-day, 25 time-TBD. Titles/days all non-empty.
  Distribution: Sat 18: 2 · Sun 19: 6 · Mon 20: 135 · Tue 21: 275 · Wed 22: 305 ·
  Thu 23: 243 · Fri 24: 143 · Sat 25: 89 · Sun 26: 17 · Mon 27: 2.
- **Timezone**: timestamps are naive local ISO (`2026-07-18T14:00:00`) — correct
  as long as the phone is on Danish time (it will be, on the playa).
- **Service-worker precache** (dist/sw.js manifest inspected): app shell, JS
  bundle, CSS, `events.json`, `destinations.json`, `map-official.png` (908 KB —
  safely under Workbox's 2 MB cap), all icons, manifest. 24 entries, ~4.9 MB.
- **Offline update path**: `registration.update()` calls are guarded by
  `navigator.onLine` and try/caught; registration failure degrades silently.
  Pull-to-refresh and the update banner can't break the app offline.
- **Favorites**: localStorage (`jomo26:favorites`), JSON-parse guarded, survives
  SW updates by design. iOS home-screen PWAs are exempt from Safari's 7-day
  storage eviction.
- **iOS install**: `apple-touch-icon` present, manifest `display: standalone` —
  Add to Home Screen gets a proper icon and chrome-less app.
- **Preview server smoke test**: `/`, `/sw.js`, manifest, events.json, map PNG,
  JS bundle, fonts all serve 200. (Chrome extension wasn't connected, so no
  in-browser click-through — that's your 2-minute list below.)

## Fixed (4 commits on local main, unpushed)

1. `63e3202` **fix: import Place type in MapTab** — repo didn't typecheck at HEAD.
2. `c6273ae` **fix: sync public/events.json** — commit 5b75c69 added "Mapping the
   River of Your Sex Life" to `src/data/events.json` only; the public copy was
   one event behind (1,216 vs 1,217). Fixed by copying the source-of-truth file
   (byte-identical to what the pipeline writes). No data regenerated.
3. `ed53199` **fix: offline hardening** — fonts (woff2) were missing from the
   Workbox glob, so offline text depended on the HTTP cache; now precached
   (+~200 KB). Also `navigator.storage.persist()` on init so the browser won't
   evict the SW cache + favorites under disk pressure.
4. `344cd0c` **perf: 1,217-card Program list** — `React.memo` on EventCard
   (search keystrokes no longer re-render every card; App's handler props are
   stable during typing) + `content-visibility: auto` on collapsed cards
   (offscreen cards skip layout/paint).

No test harness exists in this repo (no test script/framework) — fixes were
verified by build + data audit script + HTTP smoke test instead.

## Robin: 2-minute phone test (after deploy)

1. Open the installed app (or https://jomo-guide.vercel.app → reopen it once
   online so the new SW installs; tap **Update ▸** if the banner shows).
2. **Airplane mode ON**, kill the app, reopen from home screen → it must load
   fully: Program list, Map tab (official map image visible), Camps, Info.
3. Still offline: star an event → kill app → reopen → star still there.
4. Search "yoga" while the full list is showing — typing should feel smooth.
5. In Program, find **"Mapping the River of Your Sex Life"** (Wed 22, 15:30)
   and **"Invisible Touches"** (Fri 24) — confirms newest data on the phone.
6. Airplane mode OFF. Done.

If step 2 fails: open Safari/Chrome online once, wait ~10 s, retry.

## Deploy when approved

```bash
cd ~/Thrivbe-AI/projects/jomo26
git push origin main        # Vercel auto-deploys from GitHub main
```

Then on the phone: open the app once **online**, tap **Update ▸** when the
banner appears (or just reopen — it applies silently on next open). Do this
before leaving wifi/signal on Friday.

Heads-up for later (not done, deliberately): Vercel builds skip `tsc`
(`vercel.json` buildCommand) — consider `tsc -b && vite build` there after the
event; the duplicate 1.4 MB `events.json` in the precache (bundled *and* as a
public file) is by design from the spec, left alone.
