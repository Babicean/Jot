# Jot

A personal notes app with one job: **open it and you are already
writing.** A chronological stream of quick thoughts, like a chat with
yourself — type, send, done. The keyboard is already up when the app
opens.

The stream stays a lightweight inbox: thoughts worth keeping get
**kept** to one of three Library shelves — **Notes**, **Ideas**, or
**People** (one page per person; kept jots append to it). Everything
else scrolls away, or **disappears on a timer** (24h/48h) for thoughts
with an expiry date, like where you parked. Pinned notes float to the
top. Day headers roll over at 2 AM, so a 1 a.m. thought belongs to the
evening before.

Local-only by design: no accounts, no sync, no telemetry. Backup is one
JSON file, exported and imported from Settings. Installable as a PWA,
shipped as a sideloaded Android APK from the rolling `latest` release.

## Running it

```sh
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm test         # unit tests (day boundary, validation, sweep, backup)
npm run e2e      # Playwright suite against the built app (see e2e/run.mjs)
```

## The Android app

Capacitor wraps `dist/` in `android/`. CI builds, signs, and refreshes
the APK at the rolling release on every push to the release branch. The
committed keystore is a public sideload key on purpose; this app never
touches an app store.
