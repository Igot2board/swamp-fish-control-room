# Swamp Muppet

Rex's world, made for one keeper. A **Phoenix Aquatic Systems** PWA, using the existing GitHub Pages address and application identity.

## Build status

The approved Rex design is implemented on the v2 branch. This is a reviewable candidate, not a phone-verified production release. Automatic numeric photo interpretation is **not enabled**. Photos are stored locally; the keeper chooses values from the physical card and confirms preparation/timing. Automatic tube detection and color candidates are research diagnostics in Eric Mode only.

## Run and verify

No application dependencies, build server, account, analytics, or photo upload. Use any static HTTPS host or localhost for development. Node 22 is used for verification.

```
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm test
node scripts/release.mjs
```

GitHub Actions performs these checks, generates release metadata, and deploys app assets only on main. Pull requests run verification without deployment. Source code, tests, and documentation are excluded from the Pages artifact. Household test photos are never committed.

## Files

- `app.js`: approved simple interface, camera/gallery inputs, explicit confirmation, history, care notes, photo memories, backup/restore, and update coordination.
- `model.js`: pure readiness/challenge rules; approximate history and legacy records are not readiness evidence.
- `storage.js`: IndexedDB v1 → v2 additive migration, atomic writes, resumable drafts, full backup merge.
- `reader.js`: offline image preparation and conservative research tube detection. No confidence percentages, no automatic values in normal mode.
- `sw.js`: complete versioned offline shell, release consistency checks, all-client safe activation voting.
- `scripts/release.mjs`: hashes app assets and worker behavior to generate cache identity.

## Storage and updates

Database name remains `swamp-fish-control-room`. Version 2 retains the original `readings` store and adds `events` and `meta`. Old rows and their photos are unchanged. Old localStorage preferences and the timer key are left intact. The old timer and checkbox do not constitute validated challenge evidence. Explicit settings import can restore a v2 linked challenge.

Approximate seed rows have deterministic string IDs and one transaction marker. Missing values remain null. No normal update calls clear or deletes the database. Saving a test and removing its draft are one transaction. Backup includes photo bytes; restore validates first, adds missing IDs atomically, and never replaces existing records. Optional settings restore resets final home checks. Export periodically because device storage is not a cloud backup.

The installed app checks for code changes at startup and foregrounding while online. A downloaded build waits while a test, care form, or move-in form is open. Every tab must report safe before immediate activation. A v1 client has no handshake handler, so its first transition may need all old app windows closed and reopened; do not clear storage or reinstall. Subsequent v2 updates coordinate automatically. No closed/offline update guarantee.

## Care policy

See `docs/CARE_RULES.md`. Final challenge uses a documented 2 ppm / within-24-hour protocol. The older 1 ppm handoff trial is progress evidence only. App time limits (24-hour current readings, 7-day challenge evidence) are conservative product choices, not validated biological expiration times. Move-in is explicitly recorded by the keeper; after that, fishless dosing controls are unavailable.

## Before production

See `docs/VALIDATION.md`: real Android camera/gallery, offline reopening, actual v1→v2 service-worker transition, and physical-card comparisons remain required. Software tests are not phone or measurement validation.
