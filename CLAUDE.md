# Jot — agent handbook

Read this before touching anything. It is the contract for how this app is
built and shipped, inherited from Tally (`Babicean/Tally`) and Reps, and it
must stay truthful on every release.

## What Jot is

A personal notes app for one user, the owner (Babicean). Its entire reason
to exist: **open it and you are already writing.** Notion took too long to
load; thoughts died waiting. Everything is secondary to capture speed.

Two tabs plus a settings gear:

- **Jot** (home): a chronological stream of short notes, newest at the
  bottom, like a chat with yourself. The input is docked at the bottom of
  the screen, always visible. Day headers group the stream ("Today",
  "Yesterday", …) on the 2 AM tracking-day boundary. Jots can be edited in
  a sheet, deleted with a 5-second undo, given a **disappearing timer**
  (off → 24h → 48h, cycled on the capture bar; a quiet hourglass cue shows
  remaining time; expiry silently removes them — no graveyard, no undo,
  no notification), or **kept**.
- **Library**: the keeper shelves. Three fixed shelves, never user-made
  folders: **Notes** (plans, inspirations, anything), **Ideas** (the idea
  dump), **People** (one page per person: title is the name, the body
  accumulates what's worth remembering). A filter row: All | Notes |
  Ideas | People. Keeping a jot moves it off the stream (it graduated),
  clears its timer, and for People appends its text to the person's page
  (creating the page if needed). Pinned notes sort first, then by
  updated date. "+ New note" creates directly on a shelf.
- **Settings** (gear, top right): theme System/Light/Dark, accent
  Azure/Emerald/Blush, "Keyboard ready on open" toggle (default ON —
  capture is the point), Your data (export/import backup), footer with
  version.

### Non-goals (do not build)

No accounts, no sync, no server anything (but the backup JSON is the
future sync payload — keep it stable). No photos, folders, tags, markdown,
rich text, reminders, widgets, telemetry. Search and checklists are
planned (v0.4 in the original plan) but not built yet.

## Owner's voice rules (never break these)

- NO em dashes in any user-facing copy.
- Copy is brief, accurate, lowercase-calm ("jot deleted", "kept to Notes").
- When the owner dictates exact wording, ship it verbatim. Show him any
  prominent copy before shipping it.
- Propose options with a recommendation when a call is his; he picks fast.
- Ship complete: build, test, verify end-to-end, THEN show, with
  screenshots, version bumped, changelog written, pushed. He reads proof,
  not promises.

## Design system (house law, inherited from Tally)

- No UI framework, no CSS framework, no component library. Inter variable
  font. Biggest JS dependency is React itself.
- Everything keys off CSS custom properties at `:root` in
  `src/styles.css`: `--bg --card --card-press --ink --ink-2 --ink-3
  --accent --accent-strong --accent-ink --accent-soft --accent-text
  --fill-quiet --danger --warn --hairline --shadow-card --shadow-float
  --blur-bg --focus-ring`. Never hardcode colors in components.
- Light = porcelain (#f5f6f8 bg, white cards). Dark = Graphite (#0c0d10
  bg, #1e2126 cards, hairlines at 0.09 white alpha, inset top light-catch
  shadows). `prefers-color-scheme` + `data-theme` override on `<html>`;
  accent families via `data-accent` (azure is the default and clears the
  attribute).
- Proportional scaling: root font `clamp(13.5px, 3.8835vw, 16.7px)` and
  EVERYTHING in rem. px only for sub-pixel hairlines.
- Safe areas: `--sat`/`--sab` wrap Android 15's injected vars with
  `env(safe-area-inset-*)` fallbacks. All fixed/bottom UI includes them —
  the capture bar especially.
- Focus: `:focus-visible { outline: 3px solid var(--focus-ring);
  outline-offset: 2px }` — outline, not box-shadow.
- Hit areas: 44px-class minimum via the invisible `::after` expansion
  block at the top of styles.css. Add new small controls to that list.
- Motion: 200–400 ms cubic-bezier; `prefers-reduced-motion` respected by
  the global kill-switch. Haptics via `lib/fly.ts` `haptic()`.
- Bottom sheets for every dialog (`Sheet.tsx`: backdrop tap, Escape,
  labeled close button, drag-to-dismiss handle, focus moved inside).
  Sheets sync their fields during render, never in an effect — a sheet
  must not paint a frame of stale content.
- The toast (`Toast.tsx` + `useToast`) keeps its aria-live region mounted
  even when empty, and holding a finger on the pill pauses the dismiss
  timer. These are hard-won a11y behaviors; do not regress them.
- Feel: calm > flashy. Delighters small and rare (the send-jot fly
  animation and the gear spin are enough). Empty states teach.

## Architecture

React 18 + TypeScript + Vite, wrapped by Capacitor for Android. No
router, no state library, no backend SDK.

- **One record type** (`src/types.ts` `Note`): a jot is a Note with
  `shelf: "stream"`; keeping just changes `shelf`, clears `expiresAt`,
  stamps `updatedAt`. `checklist`/`ticked` fields are reserved for the
  future checklist feature and already validated + backed up.
- **Persistence**: localStorage, versioned payloads, one key per concern:
  `jot.notes`, `jot.settings`. EVERY write is mirrored to Capacitor
  Preferences via `lib/mirror.ts` (`MIRRORED_KEYS`), which also restores
  missing OR corrupt values from the mirror at boot. New persistent keys
  must be added to `MIRRORED_KEYS` and the backup format.
- **State hub**: `hooks/useNotes.ts` loads everything at boot, persists on
  change behind a `booted` ref (a lossy load is never written back over
  the mirror), sweeps expired jots (at boot, every 30 s, and on
  visibilitychange), rolls the tracking day at 2 AM, and syncs across
  tabs via the `storage` event. All mutations live here.
- **Day boundary**: `lib/day.ts` (`trackingDayFor`, 2 AM) — ported from
  Tally with its tests. Do not reinvent.
- **Backup** (`lib/backup.ts`): one JSON file `{app: "jot", version,
  exportedAt, notes, settings}`. Parse tolerantly (filter bad rows, never
  reject the file for one bad record). Merge union-by-id; same id → newer
  `updatedAt` wins, ties stay local. Export shares via the native sheet
  (`lib/exportFile.ts`), plain download on web.
- **Validation**: `isNote` in `lib/notes.ts` is strict; anything invalid
  is dropped on load rather than crashed on.
- **Tests**: pure-function libs with vitest sitting next to the code
  (`src/lib/*.test.ts`). Anything in the UI worth testing gets extracted
  into a lib function first.

## Repo, CI, releases

- Android wrap lives in `android/`; app id `com.babicean.jot`.
- The keystore at `android/keystore/jot-release.keystore` (alias `jot`,
  passwords `jot-release`) is a **public sideload key, committed on
  purpose** — this app never touches a store. It is NOT Tally's keystore;
  the apps' update paths are independent. `JOT_KEYSTORE_*` env vars can
  swap keys without editing the build.
- CI (`.github/workflows/android.yml`): every push to the release branch
  runs tests, builds, signs, and refreshes the rolling GitHub release
  `latest` — `…/releases/download/latest/app-release.apk` is the owner's
  install channel. Never push to `main`; all work lands on the designated
  release branch (every push ships).
- **Version ritual** on every app-visible release: `package.json`
  version; `android/app/build.gradle` `versionName` + `versionCode` (+1
  every release, no exceptions); a new `CHANGELOG.md` section
  (`## X.Y.Z — code N — date`, newest first). Docs-only commits skip it.
- PWA: `public/manifest.webmanifest`, `public/sw.js`, icons in
  `public/icons/`. Icon assets (launcher, splash) are generated by
  `e2e/_icons.mjs` from the jot-mark SVG — edit the mark there and rerun,
  never hand-edit the PNGs.
- iOS is deferred. If it comes, Tally's `codemagic.yaml` is the template.

## Verification culture (non-negotiable)

- `npm test` and `npm run build` green before every commit.
- Real-flow proof: build, run `npx vite preview --port 4173 --strictPort`
  (launch with `setsid nohup … &` in its own command or it dies with the
  shell; it also dies on every rebuild — restart it), then `npm run e2e`:
  the Playwright suite (`e2e/run.mjs`) drives the BUILT app with the
  preinstalled chromium (`/opt/pw-browsers/chromium`, phone viewport
  393×852) through every flow. Keep old scenarios green; add scenarios
  for new features in the same file.
- E2E seeds localStorage via `addInitScript` with a guard
  (`if (localStorage.getItem("jot.settings")) return;`) so reloads don't
  re-seed.
- Release proof: after CI finishes, download the APK from the release URL
  and grep the bundled JS for the new version string. Report to the owner
  with screenshots.
- Playwright gotchas: strict-mode violations (scope selectors); CSS
  `text-transform` uppercases day headers (match case-insensitively);
  `pkill` exits 144 (run it in its own command); download artifacts
  vanish on context close (`download.saveAs` first).

## Current state — v0.1.0 (code 1)

Shipped in this release:

- Capture stream with docked input, send fly animation, day headers,
  edit sheet, delete + 5 s undo (hold-to-pause toast).
- Disappearing jots: capture-bar cycle off/24h/48h, hourglass countdown
  cue, silent expiry sweep (boot + 30 s interval + visibilitychange),
  editable from the jot sheet. Kept notes never expire.
- Library: Notes/Ideas/People shelves, All filter, keep-to-shelf sheet
  with one-tap Notes/Ideas and the People name flow (append or create),
  pinning, note editor sheet (title, body, shelf, pin, delete).
- Settings: theme, three accents, keyboard-ready toggle, export/import
  backup, versioned footer.
- A11y: 44px hit targets, focus-visible outlines, always-mounted
  aria-live toast, labeled dialogs/controls, reduced-motion kill-switch.
- PWA manifest + icons + service worker; Android wrap with its own
  committed sideload keystore and rolling-release CI.

Not built yet (next up, per the original plan): search across everything
(v0.4), checklists (v0.4), then owner field-testing drives the backlog
(widget/app-shortcut capture, notify-before-expiry, timestamped People
entries, iOS, sync, archiving, photos are candidates, not commitments).
