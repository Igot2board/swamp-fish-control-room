# v2 validation record — 2026-10-15

## Baseline defects reproduced

Original app.js blob: ed6cd4310b74b1807b545679c972c27b6222249a.

- Synthetic 0.25 ppm palette colors under channel gain perturbations could produce 0 ppm with a displayed 96% confidence, for both ammonia and nitrite.
- Fully white sampled regions were filtered to no usable pixels, then returned [0,0,0], which was classified as a reading.
- Use-suggestion remained enabled on poor samples.
- Loading a replacement image retained previous calibration and scan state.

These are synthetic falsification checks, not phone accuracy estimates.

## Real photo development set

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

Several photos may be from the same testing session; do not treat them as independent samples. These were development inputs, not held-out validation. Group detection is heuristic, without OCR, chart registration, or validated in-frame swatch correction. No unattended chemical advice or numeric autofill is permitted. New photos always start with blank values and fresh diagnostics. Ordinary UI shows the photo plus all manual fields; it does not pretend an unvalidated diagnostic is a result.

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
