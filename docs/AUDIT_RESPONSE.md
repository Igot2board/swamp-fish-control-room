# PR #1 — audit fixes, 2026-10-15

Owner direction: make this effortless for Rex's keeper. Keep the technical work in Eric Mode. This revision is Swamp Muppet `2.0.0-rex.3`, reader `rex-local-0.3`.

Responds to the [six-item AMEND audit](https://github.com/Igot2board/swamp-fish-control-room/pull/1#issuecomment-6204669544) against `65c8afe4f853b3b96eab1d2cd0860cfbdb87a3b0`. This is a candidate for owner phone testing; it is not a production release or independent re-audit verdict.

## Her normal path

1. Tap **Take a test photo** or **Choose an existing photo**.
2. See **Rex's water report**, with estimates already in editable fields. Change only what does not match the physical card.
3. Tap **Matches my card — save**. The adjacent sentence makes this the explicit confirmation of the card comparison and kit mixing/waiting times.

No tube-order checkbox, no per-field accept buttons, no timing checkbox, and no extra final checkbox. Date and note are under one optional disclosure. Photo remains visible in a compact preview. If ammonia or nitrite's two candidates straddle zero, that field asks **Zero or a trace? Tap your card's match.** The rest of the report needs no individual approvals. For the latest owner photo, this is one ammonia choice plus the final save, unless she wants to correct another number.

## Audit disposition

| Finding | Change | Verification |
| --- | --- | --- |
| Too many confirmations | One prefilled, editable report; one explicit save; focused zero-boundary choice only | DOM flow tests cover prefill, no checkboxes, correction, final confirmation, photo retention, and draft removal. Provisional drafts never become confirmed history on their own. |
| Advice priority | Current ammonia/nitrite takes priority over an older passed challenge, temperature/nitrate, and pH. Occupied-tank pH can no longer overwrite the ammonia/nitrite warning. | Model regressions cover both phases and each priority level. A historical challenge result remains visible as history but cannot clear current gates. |
| False three-tube fallback | Five-tube candidates are preferred across detection passes. A chemistry-only triple is rejected if another tube-like color region shares its liquid band. | Exact reported image `1000009919.jpg`: old reader returned three numeric suggestions; new reader returns no layout and no suggestions. Synthetic three-tube, complete five-tube, and unresolved five-tube regressions are committed. |
| Gallery-only recovery | Review has separate **Retake photo** and **Choose existing photo** buttons, including when the image is unreadable. | DOM test verifies each button targets the correct input and cancelling does not erase the report. Unreadable new input leaves fields blank and still exposes both actions. |
| Progress loses earlier steps | Earlier stages now use the existing `.done` styling and a check mark; current stage has `aria-current="step"`. | Stage-model and rendered progress assertions. Missing ammonia does not earn Almost ready. Completion is based on the current supported stage, not an irreversible readiness promise. |
| Duplicate pH clutter | A low-range 7.6 estimate with a readable high-range result becomes a short explanation. The primary pH field uses high range. | DOM/model tests verify low range is not silently saved as a confirmed measurement; optional manual low-range entry remains inside the disclosure. |

Tube order is a small contextual line, not a required task. **Different order?** clears inferred values and lets her enter the card readings manually. Original analysis is retained in the draft's diagnostics. A retry starts a fresh reading after the new photo is successfully prepared; cancelling the picker retains the existing draft.

## Evidence and limits

- `npm run check`, `npm test`: 23 tests pass, including model, DOM flow, storage migration, and service-worker simulations.
- The existing eight owner photos retain the same detection outcomes: five five-tube reports, one three-tube report, two abstentions. These are development examples, not a measured accuracy rate.
- Exact additional audit photo `1000009919.jpg` was retrieved privately and replayed against both versions. Before: ammonia 2/4, nitrite 2/5, nitrate 10/20 from a false three-tube layout. After: layout null, no numeric suggestions. Image bytes are not in the public repository.
- The latest `1000010496` report remains ammonia 0 (alternate 0.25), nitrite 0.25 (alternate 0.5), nitrate 20 (alternate 40), high pH 8.2 (alternate 8.0). The historical Oct 15 seed remains the owner's handoff values, including nitrate 40 and high pH 8.0; these are not silently replaced by the reader's first choices.
- No palette recalibration or claimed accuracy improvement. Unreadable scenes still allow manual entry. No confidence percentages.
- Today's original photo is still not attached to the seeded history entry. Saving a photo through the app attaches it to that new test. No private photos are shipped to GitHub Pages.
- No actual Android/browser visual QA is claimed. The existing v1→v2 phone/update acceptance checks still apply. Production remains on main until Eric finishes the phone test and approves going live.

## Short owner phone pass

1. Take a new photo with Camera. Confirm numbers appear without approving each field.
2. For a zero-versus-trace field, tap the card match; change nitrate or pH if needed; save once. Check the saved values and photo in history.
3. Try an unreadable photo. Both retry choices must be obvious; cancellation must retain the draft.
4. Reopen an unfinished test, then save it. Check offline reopening and that saved history remains intact.
5. Check the progress rail on the small screen. In a disposable test profile/backup, exercise post-move-in care; do not mark the real tank occupied early.
6. Test the installed v1→v2 transition and a later v2 update with an unfinished draft. Existing records/photos must survive. No clearing site data or reinstalling to force an update.

Future post-move-in routine tuning, including the 24-hour dashboard freshness wording, stays separate from these audit fixes.


## Second-audit cleanup — rex.4 (2026-10-15)

The second audit accepted all six prior fixes. Both remaining cleanup items are fixed:

- A passed challenge with stale or missing current ammonia/nitrite now explicitly asks for a fresh water test. Historical challenge success cannot stand in for current chemistry.
- Save is disabled on an empty manual or unreadable-photo report. Zero counts as an entered measurement; a valid temperature alone also enables Save. Temperature input updates the button immediately. Zero-versus-trace checks are still enforced.

25 automated tests pass, including the new stale/missing-current cases and empty-report/temperature UI behavior. Reader calibration and the prior photo results are unchanged.

### Locked icon

The exact selected 1254×1254 source was retrieved and its SHA-256 verified:
`4deff47496d446ea76df529374201198b7ec33e552fc9e8116fc0e30e5321b98`.
No regeneration or art changes. Library original: `/Phoenix Aquatic Systems/PHOENIX_AQUATIC_SYSTEMS_SWAMP_MUPPET_SELECTED_ICON.png`.

Production assets now use versioned names: `rex-phoenix-v1-192.png`, `rex-phoenix-v1-512.png`, and separate `rex-phoenix-v1-maskable-512.png`. The maskable asset places the source at 368px on a 512px dark canvas with 72px padding. Rex, gills, Phoenix, and the circular reactor were visually checked inside the central safe circle; decorative tile corners may be masked. Normal assets use purpose `any`; padded asset uses only `maskable`. Manifest, favicon/apple-touch link, SW assets, and release hash inputs were updated together. `scripts/prepare-icons.py` reproduces them and rejects any other source hash. Original full-size art is not shipped.

The manifest keeps the existing id/start URL/scope. Launcher-image refresh is controlled by Android/browser/launcher caching; new filenames help but immediate icon replacement is not promised. Back up records before considering any remove/re-add step; do not clear site data to force an icon change.

### Isolated phone test

Private test URL: https://swamp-muppet-eric-phone-test.igot2board.chatgpt.site
Open in Chrome on Eric's Android while signed into the owning ChatGPT account. This is a separate origin and test history, not the wife's existing GitHub Pages install. The deployment copies the exact candidate's app files; staging provenance is retained outside the served assets. Use it for photo/gallery/retry, editable numbers, Save, layout, and icon checks. A download/update here does not update the production app. The real production v1→v2 transition remains a final owner check.

No production merge/deployment is authorized by this preview. The candidate is ready for the other G's quick regression and Eric's phone pass once the preview deployment reports success.


## Phone-test startup repair — rex.5

Eric reported the preview briefly loaded and then showed Chrome ERR_FAILED. Authenticated HTTP probes of the deployed host confirmed `/` returns 200 HTML, `/index.html` returns 307 to `/`, and `/sw.js` and `/version.json` return 200. The worker was caching the followed redirect and replaying it for navigations, which have manual redirect mode. This is a known incompatible response shape for navigation.

The worker now converts same-origin followed redirects to a fresh Response before caching/replaying them, preserving content/status without redirect history. Cross-origin redirects are rejected, so sign-in pages cannot be substituted for the app. First-install controller acquisition no longer forces an immediate reload; existing installed clients still reload on a genuine controller update. IndexedDB and saved photos are untouched.

27 tests pass, including regression coverage for redirected HTML installation/navigation and rejection of cross-origin sign-in HTML. Real Chrome-on-Android confirmation remains Eric's test. Existing failed preview tabs may need closing once so the repaired worker can activate. Production is still unchanged.
