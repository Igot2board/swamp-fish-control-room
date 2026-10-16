# v2 validation record — 2026-10-15

## Baseline defects reproduced

Original app.js blob: ed6cd4310b74b1807b545679c972c27b6222249a.

- Synthetic 0.25 ppm palette colors under channel gain perturbations could produce 0 ppm with a displayed 96% confidence, for both ammonia and nitrite.
- Fully white sampled regions were filtered to no usable pixels, then returned [0,0,0], which was classified as a reading.
- Use-suggestion remained enabled on poor samples.
- Loading a replacement image retained previous calibration and scan state.

These are synthetic falsification checks, not phone accuracy estimates.

## Initial real photo development set (reader 0.1)

Eight owner-supplied original images were processed locally at maximum 480 px for research detection. Their contents are not committed or uploaded to the public repository. No independent numeric labels were supplied, so exact-class accuracy, zero false-negative rate, or confidence calibration cannot be measured.

| File ending | Actual scene | Candidate behavior |
| --- | --- | --- |
| 0496 | Five tubes with chart, strong glare | Abstains from row detection |
| 0391 | Single tube before reagent bottle | Abstains from row detection |
| 0372 | Five tubes with chart, strong glare | Abstains from row detection |
| 0310 | Five tubes on white backing, strong glare | Finds five candidate regions; some liquid samples rejected |
| 0309 | Five tubes on white backing | Finds five candidate regions |
| 0308 | Five tubes on white backing | Finds five candidate regions |
| 0288 | Five tubes, room background | Finds only the three chemistry tube regions; not a complete five-tube detection |
| 0267 | Three chemistry tubes with chart | Finds three candidate regions |

Several photos may be from the same testing session; do not treat them as independent samples. These were development inputs, not held-out validation. Group detection is heuristic, without OCR, chart registration, or validated in-frame swatch correction. No unattended chemical advice or confirmed numeric autofill is permitted. New photos always start with blank confirmed values and fresh diagnostics. See the reader 0.2 follow-up below for the owner-authorized estimate/accept workflow.

## Software verification

15 Node tests at initial candidate: additive IndexedDB upgrade from v1 with photo preservation; idempotent seeds; atomic save/draft removal; aborted import rollback; empty/approximate/stale/future values; 1 ppm and late challenges; valid challenge and intervening water change; occupied-tank controls; unusable pixel abstention; update voting across tabs; cache isolation; offline asset error behavior; and a DOM interaction smoke test for save/history/Eric Mode.

The DOM smoke test uses linkedom and fake-indexeddb. It is not browser layout QA. Service worker tests use a simulated environment, not Android. Browser control is unavailable in this environment, so no browser, camera, or viewport success is claimed.

## Required phone checks before merging to main

1. On her Android phone, verify separate rear-camera and gallery paths; cancellation returns without creating a blank test.
2. Save a photo test, close/reopen, verify values and photo; interrupt a test and verify draft resume.
3. Test the old installed build → v2 with real existing history. Close old v1 windows if required. No reinstall, storage clearing, or changed origin.
4. Test a subsequent v2 update while a draft is open and while idle; test a second open tab.
5. Open online, then offline: launch, save, and view history. Restore connectivity and verify update retry.
6. Export and merge a backup including photos. Check optional settings restore on a fresh profile.
7. Let her use camera, gallery, save, and progress without coaching. Check 320–480 px layout, text sizing, keyboard, and touch targets.
8. Collect independently read values for a fresh correctly timed kit test before considering numeric photo suggestions. Keep new sessions held out from threshold tuning.

## Deliberate limits

No push notifications while closed; no cloud sync; device clearing can still remove local data. Numeric photo interpretation is an explicitly unfinished research feature. The core keeper-confirmed workflow is usable without it. Do not merge this candidate as a fully validated automatic-reader release.

## Reader 0.2 — owner-requested estimates / acceptance

Eric requested usable best-effort suggestions now, with “Looks right” or “Let me change it.” The review screen now shows “Rex’s water report.” Values remain null until explicitly accepted or manually entered; final physical-card and timing confirmation is still required before saving. Declining clears that value. Changing the confirmed tube order revokes prior accepted suggestions. Saved records preserve original candidates and the keeper’s acceptance/correction provenance.

The detector now has a shared-liquid-band pass that tolerates narrow glare stripes. It finds five candidate tubes in 0496, 0310, 0309, 0308, and 0288; three in 0267; abstains in 0391 and 0372. This is development-set behavior, not independent validation. Some shoulder regions may still be mistaken for tube centers. The keeper must verify tube order. Low-range pH estimates are now available, with 7.6 shown as the top of the scale.

The score blends normalized-color and raw Lab distance to reduce exposure sensitivity, retaining more brightness weight for ammonia. Fully white, dark, or neutral unusable samples still abstain. Single-channel saturation is no longer treated as the same thing as white glare. No score is presented as a confidence percentage. This heuristic is not in-frame chart registration and can be wrong; adjacent candidates are visible so the keeper can compare the physical chart. The latest supplied photo produces ammonia 0 (alternative 0.25), nitrite 0.25 (alternative 0.5), nitrate 20 (alternative 40), high pH 8.2 (alternative 8.0). These are software outputs, not independently verified concentrations.

16 targeted tests now pass, including acceptance/decline and non-bypass of final confirmation. Actual Android and held-out measurement checks remain open.


## Audit follow-up — rex.3 / reader 0.3 (2026-10-15)

This section supersedes the older per-estimate acceptance UI described above. See `AUDIT_RESPONSE.md` for the item-by-item disposition and phone pass. The report now preloads provisional values; the keeper edits exceptions and confirms once with “Matches my card — save.” Only ammonia/nitrite zero-versus-trace choices need an extra action. Numeric accuracy is still not calibrated.

All six audit items are addressed. The exact additional historical `1000009919.jpg` failure was reproduced with reader 0.2 and is now rejected by 0.3. The eight existing development inputs retain their prior detection outcomes. The new automated suite has 23 passing checks, including one report through correction and save, camera/gallery retry routing, unknown-image fallback, current-chemistry priority, cumulative stage styling, and pH consolidation. Real Android and installed update testing remain pending.


## Second audit — rex.4

25 tests pass. Passed-challenge stale/missing chemistry prompts a fresh test. Empty reports cannot save; zero and valid temperature count as entered data. Selected icon source hash is verified, derived assets and release lists match, and the padded icon was visually checked under the maskable safe-circle crop. Private phone preview and remaining actual Android checks are documented in AUDIT_RESPONSE.md.
