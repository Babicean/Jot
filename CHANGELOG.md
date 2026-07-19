# Changelog

## 0.2.1 — code 5 — 2026-07-19

Lists that tick.

- Checklists: any Library note flips into checklist mode from its
  editor. Every line becomes an item with a tick circle; ticked items
  get a quiet strikethrough and sink below the unticked ones; the
  note's row shows "2 of 6". An add item field grows the list without
  leaving checklist mode; flip the switch off to edit lines as text.
- Storage stays dumb: a checklist is still one plain note, so backups,
  merge, and search treat it like any other.

## 0.2.0 — code 4 — 2026-07-19

Retrieval is the other half of capture.

- Search: a field at the top of the Library that searches everything.
  Stream jots and all three shelves, titles and bodies, plain
  case-insensitive matching as you type. Results group under Stream,
  Notes, Ideas, and People; tapping a stream hit opens the jot sheet,
  a shelf hit opens the note editor. Trash never surfaces.

## 0.1.2 — code 3 — 2026-07-19

A second safeguard behind the quick undo.

- Trash: deleting a jot or note now moves it to a Trash that holds it
  for 30 days, then cleans itself out. A quiet "Trash · N" link sits at
  the foot of the Library whenever something is in it; the sheet shows
  what each entry was, how long it has left, restore per note, and
  Empty trash.
- The 5-second undo toast stays as the fast path. Expired disappearing
  jots still skip the Trash entirely; vanishing is their point.
- Backups now carry the deletion state; older backups and existing
  installs load unchanged.

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
