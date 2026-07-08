# Codex delegation log

| Date | Task | Passes | Outcome | Verified by | Review caught |
|---|---|---|---|---|---|
| 2026-07-07 | PLAN-events-camps-map-signs A–E (event↔camp links, map art calibration scaffold, Close relabel, signs legend, flag emoji) | codex×2 | shipped | independent build + esbuild runtime link-count (661/1215, 83 camps) + Playwright QA on preview (chip round-trip, same-camp reselect, filter-clear, H5 nesting, emoji badges, signs legend, 13/13 plaza bubbles) | same-camp reselect no-op, competing smooth-scrolls, broken heading outline, filter dead-end, Care/Support→Pampering/Care legend bug, dup-title guard |
| 2026-07-07 | Round 2+3: map-square day grouping, header credits, serendipity no-repeat, whole-row card toggle | codex×2 (serialized rounds) | shipped | independent build + Playwright QA (credits text, 12 unique rolls, row open/close, stopPropagation on badge/star, 6 day-pill groups on map square) | — |
| 2026-07-08 | PWA auto-update: prompt-mode SW + top update banner + pull-to-refresh + silent apply-on-foreground | codex×1 | shipped | independent build + two-build Playwright e2e (persistent context): build A registers SW, star saved, build B deployed, banner appears, tap Update reloads onto B, stars survive in localStorage, banner clears | engine/gesture read-reviewed (listener cleanup, refs, offline guards, single reload trigger) |
