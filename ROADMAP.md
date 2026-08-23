# Roadmap

Horizons, not a backlog. The guide's promise — a photocopied paper program, legible in
sunlight, no chrome — never changes. Everything below goes *underneath* it.

---

## Now — 2026 guide polish

Small, self-contained, no backend required.

- Interactive playa map — parse grid to pins; requires map asset rights and a real coordinate system.
- "One good thing per day" — nudge to pick a single daily anchor, treat that as success.
- Favorites export/backup — share and restore your schedule.
- Live/auto data refresh — only if the program shifts mid-event.
- Next-year re-point checklist.

---

## 2027 — the operating system behind the guide

**Robin, 2026-08-04:**

> This year was very chill. Next year I'd like to go full out and create an entire
> operating system around Borderland — with mission boards, tasks, to-dos, quests, etc.
> — for myself, but also for and with others. And I'd like to integrate that into the
> back end, on the deeper layers of the Jomo app itself, so that it becomes an entire
> operating system and framework hidden behind the Jomo guide.

### What this decides

`CONCEPT-hidden-layer-and-missions.private.md` closes on an open question:

> *Does missions v1 ship for 2027, or is 2027 the hidden layer only?*

**Answer: both, and more.** 2027 is not "the guide plus a feature." The guide becomes the
visible surface of a year-round system. The concept doc's suggested sequencing (hidden
layer first, missions v1 open-only, v2 later) was scoped to shipping *an event feature* —
this reframes the target, so that sequencing needs revisiting rather than following.

### The shift: two audiences, one substrate

The concept doc assumes missions flow **Quants → participants** during the event. This adds
a second axis the doc doesn't cover:

| | Existing concept | What 2027 adds |
|---|---|---|
| **Who** | participants, during the burn | **Robin himself**, year-round — plus others, collaboratively |
| **When** | the week of the event | build-up, event, teardown, off-season |
| **What** | missions, quests, hidden layer | **mission boards, tasks, to-dos** — real work tracking |
| **Why** | the experience | the experience *and* actually running things |

The bet is that these are the same substrate. A to-do Robin assigns himself in February and
a mission the Quants hand a stranger in July are the same row in the same table, differing
only in visibility, framing, and who can claim them. If that holds, the OS is one system
wearing two faces. **If it doesn't hold, this is two products and should be split early** —
that is the first thing to prove.

### Where it lives

Underneath, in the deeper layers of the app, not as a new surface. The existing rule stands:
*a primitive interface over a sophisticated system.* The OS is reached the way every other
depth is reached — by doing something in the world, not by tapping a tab labelled
*Advanced*. Someone using the guide to find a workshop should never learn it exists.

Backend is already provisioned (see the concept doc, "Backend: DECIDED"), which removes the
expensive-to-reverse choice that blocked the original sequencing.

### Open, before this becomes a plan

- **Is it really one substrate?** Personal task tracking and diegetic missions may want
  opposite things (precision and reminders vs. ambiguity and no points). Part 5 of the
  concept doc argues hard *against* points and progress metrics — a personal OS usually
  wants exactly those. This tension is the crux; resolve it before building.
- **Year-round means retention.** The event carries the guide for one week. What makes
  anyone — including Robin — open it in November?
- **"With others" — how many, and who?** Co-owned boards for a camp is a different build
  from a public mission board.
- **Off-the-shelf underneath?** Bloom already exists and is agent-native. Worth asking
  whether the OS is a new build or the guide becoming a *client* of something already
  running.
- **Scope honesty.** "Entire operating system" is a direction, not a 2027 deliverable.
  What is the smallest version that would prove the thesis by next summer?

### Related

- `CONCEPT-hidden-layer-and-missions.private.md` — the 1375-line concept this extends.
  Parts 1–2 (hidden layer, missions), Part 3 (zones, quests), Part 4 (constellations),
  Part 5 (why no points).
- `SPEC.md`, `PLAN-events-camps-map-signs.md` — current shipped scope.
