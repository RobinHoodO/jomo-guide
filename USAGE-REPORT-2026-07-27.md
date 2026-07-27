# JOMO Guide — post-burn usage report

**Date:** 2026-07-27 · **Site:** https://www.jomoguide.com (Vercel project `jomo-guide`)
**Period covered:** 2026-07-07 (launch) → 2026-07-27 (today) · Borderland 2026 ran ~20–26 July

---

## TL;DR

**We cannot answer "how many users".** The guide shipped with no analytics. Vercel Web
Analytics is *enabled and billed* on the project, but the client script was never added to
the app, so it recorded zero pageviews. Speed Insights: `hasData: false`. Sentry captures
errors only — no pageload transactions, no session tracking.

The only usage-shaped data that exists is **51 crash reports**, and ~35 of those come from
in-app-browser wrappers rather than our code. That is enough to read *shape* — who, where,
when, on what — but not **volume**. Any user count in this report would be invented, so
there isn't one.

---

## What was actually measurable

### 1. Distribution channel: Facebook

| Browser | Events | Read as |
|---|---:|---|
| Facebook in-app browser | 26 | link opened from a Facebook post/group |
| Chrome Mobile iOS | 12 | standalone / normal browser |
| Brave | 5 | |
| Chrome Mobile (Android) | 5 | |
| Ecosia Android | 2 | |
| Chrome (desktop) | 1 | |

Over half of all traffic signal arrived through **Facebook's in-app browser**, concentrated
8–22 July. The guide spread through the Borderland Facebook group, not through search or
direct sharing. Worth knowing: that's the channel to seed first next year.

### 2. Geography — Nordic core, European spread

| Country | Events | | Top cities | |
|---|---:|---|---|---:|
| 🇸🇪 Sweden | 28 | | Gothenburg | 11 |
| 🇩🇰 Denmark | 7 | | Copenhagen | 3 |
| 🇩🇪 Germany | 4 | | Berlin / Hamburg | 2 / 2 |
| 🇫🇮 Finland | 3 | | Vienna | 2 |
| 🇺🇸 US · 🇦🇹 AT | 2 · 2 | | Malmö · Öjersjö | 2 · 2 |
| 🇳🇴 NO · 🇫🇷 FR · 🇹🇷 TR · 🇧🇬 BG · 🇱🇹 LT | 1 each | | Helsinki · Oslo | 2 · 1 |

Matches the Borderland demographic exactly. Gothenburg dominates.

### 3. Platform: phone-only, as designed

Android 25 · iOS 25 · macOS 1. **Effectively zero desktop use.** The mobile-first,
2-row-card, 40px-tap-target design decisions were the right call.

### 4. When it was used

Hour-of-day, all events, converted to local (CEST):

```
09:00  #####      5
10:00  ##         2
11:00  ##         2
12:00  #####      5
13:00  ###########  11   ← peak
14:00  #########   9
15:00  ##         2
16:00  ##         2
17:00  #          1
18:00  #          1
19:00  ##         2
20:00  #          1
21:00  #          1
22:00  ###        3
```

**67% of all activity falls between 09:00 and 15:00 local; the single busiest window is
13:00–15:00 (39%).** People opened the guide late morning / early afternoon to plan the day
ahead — not in the evening to see what's on now. That's a real product finding: the
"what's on right now" framing may matter less than "what should I do today".

### 5. Two distinct usage arcs

| Phase | Dates | Signature |
|---|---|---|
| **Planning** | Jul 8–19 | Facebook in-app browser, from home cities (Gothenburg, Copenhagen, Berlin) |
| **On-site** | Jul 20–24 | Chrome Mobile / Chrome Mobile iOS — installed PWA, not the FB browser |
| **Silence** | Jul 25–27 | zero events |

Daily counts: Jul 8 (5) · 9 (3) · 10 (3) · 11 (2) · 12 (4) · 13 (2) · 14 (1) · 16 (1) ·
17 (2) · 18 (2) · 19 (5) · 20 (5) · 21 (2) · 22 (2) · 23 (10) · 24 (1).

⚠️ **The Jul 23 "spike" is an artifact** — 9 of those 10 events are one `RangeError:
Maximum call stack size exceeded` firing repeatedly on a single iOS device. One user, not
nine.

### 6. The silence after Jul 24 is good news

The burn ran to ~26 July but telemetry stops dead on the 24th. That is almost certainly the
PWA **working as designed**: no connectivity on the field → service worker serves the
precached bundle → nothing reaches Vercel or Sentry. The offline-first architecture that
made the guide useful is also what makes it unmeasurable.

---

## Why there are no numbers

| Source | Status | Why |
|---|---|---|
| Vercel Web Analytics | **enabled, zero data** | `@vercel/analytics` never installed; no `/_vercel/insights/script.js` in the built HTML — verified against live prod |
| Vercel Speed Insights | **no data** | `speedInsights.hasData: false` |
| Vercel Observability | **likely expired** | Pro-tier retention is short; the burn week is probably already rolled off. Worth eyeballing the dashboard today before it's certainly gone |
| Sentry — transactions | **none** | `tracesSampleRate: 0.1` is set but tracing is tree-shaken out of the Vite build; project has 0 transaction events |
| Sentry — sessions | **9 in 90 days** | no `release` set in `Sentry.init`, so release health never engaged |
| Sentry — errors | **51 events, 15 issues** | the dataset above |
| Sentry — unique users | **0** | `sendDefaultPii` off, so no `user` on any event |

Also worth noting for triage: of the 15 issues, only **one** (`target?.click is not a
function`, Jul 7, 1×) is our code. The rest are Facebook's `iabjs://` native bridge,
Firefox's `__firefox__` injection, and `window.webkit` probes from in-app browser wrappers.
The app itself was, by this measure, clean through the whole burn.

---

## Next steps — options, cheapest first

**1. Two-line fix for next year (recommended).** Web Analytics is already enabled and paid
for on the project; it just has no client.

```
npm i @vercel/analytics
# src/App.tsx: import { Analytics } from '@vercel/analytics/react'  →  <Analytics />
```

That alone gives pageviews, unique visitors, top pages, referrers, countries, devices.

**2. Set a Sentry release** (`release: __APP_VERSION__` in `Sentry.init`) — turns on session
tracking and unique-user counts for free, and makes "did the new deploy break anything"
answerable.

**3. Accept that on-playa usage stays invisible** — or don't. Any beacon-based analytics
misses exactly the moment that matters, because there's no signal on the field. If real
on-site numbers matter, the guide would need to buffer events in localStorage and flush them
on reconnect. That's a build, not a config change; flagging it rather than assuming it.

**4. Grab whatever Vercel Observability still holds — today.** Retention is short and the
burn week is on the edge of it.

---

*Sources: Vercel REST API (project config, domains, deployments, team billing), Sentry API
(org `thrivbe`, project `jomo-guide`, id 4511695122464848), live prod HTML, and the jomo26
source tree. Raw pulls in the session scratchpad.*

---

# What to improve, ranked by what the data actually says

## 1. Facebook's in-app browser cannot install a PWA — and it was 51% of arrivals ⭐

This is the biggest finding in the whole report. 26 of 51 events came through the Facebook
in-app browser (`FBAN`/`FBAV` WebView). **That WebView has no "Add to Home Screen".** So the
majority of people who opened the guide got a *webpage* — not an offline guide. The moment
they lost signal on the field, they had nothing.

The app's only install guidance is static prose in `InfoTab.tsx:173–191` — inside the 5th of
5 tabs, which nobody in an in-app browser will find.

**Fix:** detect the in-app browser from the UA and show a dismissible top banner —
*"Open in Safari/Chrome to install this and use it offline"* — with a copy-link button. Gate
it on `!window.matchMedia('(display-mode: standalone)').matches` so it disappears once
installed. Maybe 40 lines. Nothing else in this list comes close in leverage.

## 2. No install prompt on Android

Android was half of all traffic and Chrome fires `beforeinstallprompt` — the app never
captures it. Capture the event and surface a single dismissible "Install" button.
iOS can't do this (Safari has no equivalent), so iOS keeps the Info-tab instructions, but
the banner from #1 should point there directly rather than making people hunt.

## 3. Nothing is shareable except the homepage

The guide spread socially — that's the whole distribution story — yet there are no deep
links. No URL state anywhere in `src/`, no `navigator.share`. You cannot send someone "come
to this event", only "here's the guide". Per-event `?e=<id>` links plus a share button on
`EventCard` turns every user into a distribution channel, which is precisely the channel
that already worked.

*(Per-event `.ics` export already exists in `EventCard.tsx:206` — that part is done.)*

## 4. Lead with "today", not "now"

67% of use falls 09:00–15:00 local, peaking 13:00–15:00. That is **day-ahead planning**, not
"what's on right now". But `Program.tsx:96–107` gives the top of the default tab to
Serendipity (a random pick) and then NowNext (now/soon). The dominant job — *"what's
happening today that I should aim for"* — has no dedicated surface.

**Fix:** a compact "rest of today" strip above Serendipity — N events left today, your N
starred, next clash. Cheap, and it matches measured behaviour.

## 5. Sentry is close to useless in its current state — three small fixes

| Problem | Fix |
|---|---|
| No `release` in `Sentry.init` (`main.tsx:12`) → session tracking and unique-user counts never engaged (9 sessions in 90 days) | set `release: __APP_VERSION__` |
| No source maps uploaded → the one crash that might be ours (`RangeError: Maximum call stack size exceeded`, 9× on one iOS device, Jul 23) has a stack trace of literally `undefined:28`. Undiagnosable. | add `@sentry/vite-plugin` |
| 14 of 15 issues are in-app-browser wrapper noise (`iabjs://`, `__firefox__`, `window.webkit`) drowning real signal | add `ignoreErrors` / `denyUrls` filters |

## 6. Delete desktop considerations

1 desktop event out of 51. Any layout work above ~430px is dead weight — worth confirming
before deleting, but don't spend another hour on it.

## 7. Decide whether on-playa usage should be measurable at all

Telemetry stops Jul 24 while the burn ran to the 26th, because the PWA correctly served
everything from cache with no connectivity. Every beacon-based analytics tool will miss
exactly the window that matters.

If those numbers matter, the guide has to buffer events in localStorage and flush on
reconnect. That's a build, not a config change — flagging it as a decision rather than
assuming it's wanted. **If it isn't wanted, accept explicitly that all measurement is
pre-burn planning behaviour only**, and stop expecting on-site numbers.

---

## Suggested order

**Before next year's guide:** #1 → #3 → #2 (distribution and install — these decide whether
people end up with a working offline guide at all).
**Whenever:** #5 (an hour, makes the next burn debuggable), #4 (cheap alignment win).
**Decide, don't default:** #7. **Ignore:** #6 until it's in the way.
