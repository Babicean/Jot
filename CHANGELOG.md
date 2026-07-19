# Changelog

## 0.1.1 — code 2 — 2026-07-19

Owner feedback from day one: filing a jot should be reachable from the
place you naturally tap.

- The edit jot sheet now has a Keep row (Notes / Ideas / People). Tap a
  jot, file it in one more tap. Text edits made in the sheet travel with
  the keep, and People goes straight to "who is this about?".
- The bookmark on each jot row still keeps in one tap from the stream.

## 0.1.0 — code 1 — 2026-07-19

The first shippable Jot. Open it and you are already writing.

- Capture stream: docked bottom input, send flies the jot into the
  stream, day headers on the 2 AM boundary ("Today", "Yesterday", …).
- Jots: tap to edit in a sheet, delete with a 5-second undo (hold the
  toast to pause it), keyboard ready on open (Settings toggle, ON).
- Disappearing jots: a capture-bar timer cycles off → 24h → 48h; an
  expiring jot shows a quiet hourglass cue with remaining time and
  silently vanishes at expiry. Timers can be added or removed later from
  the edit sheet. Kept notes never expire.
- Library: three fixed shelves (Notes / Ideas / People) with an
  All | Notes | Ideas | People filter row, pinning (pinned first, then
  newest updated), "+ New note", and a full note editor sheet (title,
  body, shelf, pin, delete).
- Keep: one tap moves a jot off the stream onto a shelf. Keeping to
  People asks who it's about and appends the jot to that person's page,
  one page per person, creating it if needed. Every keep is undoable.
- Settings: System/Light/Dark theme, Azure/Emerald/Blush accents,
  keyboard-ready toggle, export/import backup (one JSON file, merge by
  id, tolerant parsing), "your notes stay on this device."
- Foundation: localStorage with a native Capacitor Preferences mirror
  (corrupt-value recovery included), strict validation on load, PWA
  manifest + icons + offline service worker, Android app with its own
  committed sideload keystore and a rolling `latest` APK release from CI.
