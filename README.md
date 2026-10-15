# Swamp Fish Control Room

A phone-first installable PWA for an axolotl tank: API liquid-test logging, plain-English cycling verdicts, photo-assisted color matching, offline history, trend charts, a water-change calculator, and a 24-hour biofilter challenge timer.

## What makes it useful

- **Simple-first Quick Check:** tap ammonia, nitrite, nitrate, pH, and temperature; get a big GO/HOLD verdict and next steps.
- **Photo Assist:** take/select a test photo, optionally white-balance from the API card, tap the center of a tube, and get a color-based estimate + confidence. It never silently replaces the human reading.
- **Persistent offline history:** readings and optional compressed photos are stored in IndexedDB on the phone.
- **Trend graph:** ammonia, nitrite, nitrate, pH, and temperature.
- **24-hour challenge timer:** starts at the ammonia dose and can create an `.ics` calendar event for the retest.
- **Water-change calculator:** estimates replacement percentage and gallons from current/target nitrate.
- **Eric Mode:** raw control-room view and stage-by-stage nitrification status.
- **No account and no cloud:** everything is local to the device unless the user exports a JSON backup.

## Run locally

Service workers need HTTP(S), not `file://`.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Put it on a phone with GitHub Pages

1. Create a GitHub repository (for example `swamp-fish-control-room`).
2. Put these files at the repository root and push to `main`.
3. In **Settings → Pages**, set the source to **GitHub Actions** if GitHub asks.
4. The included workflow deploys automatically.
5. Open the HTTPS Pages URL on the phone.
6. Android/Chrome: use **Install app** or browser menu → **Add to Home screen**.
7. iPhone/Safari: **Share → Add to Home Screen**.

The manifest and service worker use relative URLs, so the app works from a GitHub Pages repository subpath.

## Photo Assist note

The color estimator uses a sampled region of the photo and approximate API palette colors, with optional white-balance calibration. Camera processing, flash, room light, test timing, plastic tubes, and card printing can all shift apparent color. The app intentionally shows confidence and keeps manual confirmation as the source of truth.

## Data model / privacy

- Settings: `localStorage`
- Readings + saved photos: browser `IndexedDB`
- No analytics, ads, accounts, remote database, or network API calls
- JSON backup export intentionally omits photos to keep the backup small and portable

## Updating the offline app

When changing app files, increment `CACHE` in `sw.js` (for example `swamp-fish-v2`) so installed copies refresh their cached assets.
