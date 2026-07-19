import type { DayKey, LibraryShelf, Note, Shelf } from "../types";
import { trackingDayFor } from "./day";
import { mirrorWrite } from "./mirror";

/**
 * Persistence lives behind this tiny repository so the storage engine can be
 * swapped (IndexedDB, a synced backend, …) without touching UI code. The
 * payload is versioned for painless future migrations.
 */
const STORAGE_KEY = "jot.notes";
const STORE_VERSION = 1;

interface StoreShape {
  version: number;
  notes: Note[];
}

const SHELVES: Shelf[] = ["stream", "notes", "ideas", "people"];

/** Strict validation on load — a corrupt record is dropped, never crashed on. */
export function isNote(value: unknown): value is Note {
  if (typeof value !== "object" || value === null) return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.id === "string" &&
    n.id.length > 0 &&
    typeof n.text === "string" &&
    typeof n.title === "string" &&
    typeof n.createdAt === "number" &&
    Number.isFinite(n.createdAt) &&
    typeof n.updatedAt === "number" &&
    Number.isFinite(n.updatedAt) &&
    typeof n.day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(n.day) &&
    SHELVES.includes(n.shelf as Shelf) &&
    (n.expiresAt === null ||
      (typeof n.expiresAt === "number" && Number.isFinite(n.expiresAt))) &&
    typeof n.pinned === "boolean" &&
    typeof n.checklist === "boolean" &&
    Array.isArray(n.ticked) &&
    n.ticked.every((t) => typeof t === "number") &&
    // Absent on records from before the Trash existed — tolerated.
    (n.deletedAt === undefined ||
      n.deletedAt === null ||
      (typeof n.deletedAt === "number" && Number.isFinite(n.deletedAt)))
  );
}

/** Fill fields that older stored records predate. */
export function normalizeNote(note: Note): Note {
  return { ...note, deletedAt: note.deletedAt ?? null };
}

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed || !Array.isArray(parsed.notes)) return [];
    return parsed.notes.filter(isNote).map(normalizeNote);
  } catch {
    // Corrupt or inaccessible storage: start clean rather than crash.
    return [];
  }
}

export function saveNotes(notes: Note[]): void {
  try {
    const payload: StoreShape = { version: STORE_VERSION, notes };
    const json = JSON.stringify(payload);
    localStorage.setItem(STORAGE_KEY, json);
    mirrorWrite(STORAGE_KEY, json);
  } catch {
    // Storage full or unavailable — the in-memory state still works.
  }
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The two disappearing-jot choices; a custom picker is Notion-shaped. */
export const EXPIRY_HOURS = [24, 48] as const;
export type ExpiryChoice = 0 | 24 | 48;

/** Cycle the capture-bar timer: off → 24h → 48h → off. */
export function nextExpiryChoice(current: ExpiryChoice): ExpiryChoice {
  if (current === 0) return 24;
  if (current === 24) return 48;
  return 0;
}

/** A new jot in the capture stream. */
export function createJot(
  text: string,
  expiry: ExpiryChoice = 0,
  when: Date = new Date(),
): Note {
  const now = when.getTime();
  return {
    id: newId(),
    text: text.trim(),
    title: "",
    createdAt: now,
    updatedAt: now,
    day: trackingDayFor(when),
    shelf: "stream",
    expiresAt: expiry === 0 ? null : now + expiry * 3600_000,
    pinned: false,
    checklist: false,
    ticked: [],
    deletedAt: null,
  };
}

/** A note created directly in the Library ("+ New note"). */
export function createLibraryNote(
  shelf: LibraryShelf,
  title: string,
  text: string,
  when: Date = new Date(),
): Note {
  const now = when.getTime();
  return {
    id: newId(),
    text: text,
    title: title.trim(),
    createdAt: now,
    updatedAt: now,
    day: trackingDayFor(when),
    shelf,
    expiresAt: null,
    pinned: false,
    checklist: false,
    ticked: [],
    deletedAt: null,
  };
}

export interface SweepResult {
  notes: Note[];
  /** How many notes vanished (silently — that is the point). */
  removed: number;
}

/** How long the Trash holds a deleted note before purging it. */
export const TRASH_RETENTION_MS = 30 * 24 * 3600_000;

/**
 * Drop what has run out of time: expired stream jots (kept notes never
 * expire) and Trash entries past their 30 days.
 */
export function sweepExpired(notes: Note[], now: number): SweepResult {
  const kept = notes.filter((n) => {
    if (n.deletedAt !== null) return n.deletedAt + TRASH_RETENTION_MS > now;
    return !(
      n.shelf === "stream" &&
      n.expiresAt !== null &&
      n.expiresAt <= now
    );
  });
  return { notes: kept, removed: notes.length - kept.length };
}

/** Trash contents, most recently deleted first. */
export function trashNotes(notes: Note[]): Note[] {
  return notes
    .filter((n) => n.deletedAt !== null)
    .sort((a, b) => b.deletedAt! - a.deletedAt! || a.id.localeCompare(b.id));
}

/** "clears in 23d", or "clears today" inside the final day. */
export function clearsInLabel(deletedAt: number, now: number): string {
  const ms = Math.max(0, deletedAt + TRASH_RETENTION_MS - now);
  const days = Math.floor(ms / (24 * 3600_000));
  return days < 1 ? "clears today" : `clears in ${days}d`;
}

/** Stream jots, oldest first (the stream reads top to bottom like a chat). */
export function streamNotes(notes: Note[]): Note[] {
  return notes
    .filter((n) => n.shelf === "stream" && n.deletedAt === null)
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

export interface DayGroup {
  day: DayKey;
  notes: Note[];
}

/** Group the stream under day headers, oldest day first. */
export function groupStream(notes: Note[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const note of streamNotes(notes)) {
    const last = groups[groups.length - 1];
    if (last && last.day === note.day) {
      last.notes.push(note);
    } else {
      groups.push({ day: note.day, notes: [note] });
    }
  }
  return groups;
}

export type LibraryFilter = "all" | LibraryShelf;

/** Library notes for a filter: pinned first, then by last update, newest first. */
export function libraryNotes(notes: Note[], filter: LibraryFilter): Note[] {
  return notes
    .filter(
      (n) =>
        n.shelf !== "stream" &&
        n.deletedAt === null &&
        (filter === "all" || n.shelf === filter),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.updatedAt - a.updatedAt ||
        a.id.localeCompare(b.id),
    );
}

/** Existing People-page names, alphabetical, for the keep sheet's suggestions. */
export function peopleNames(notes: Note[]): string[] {
  return notes
    .filter(
      (n) =>
        n.shelf === "people" && n.deletedAt === null && n.title.trim() !== "",
    )
    .map((n) => n.title.trim())
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** The one-page-per-person lookup: case-insensitive title match. */
export function findPerson(notes: Note[], name: string): Note | null {
  const target = name.trim().toLowerCase();
  if (target === "") return null;
  return (
    notes.find(
      (n) =>
        n.shelf === "people" &&
        n.deletedAt === null &&
        n.title.trim().toLowerCase() === target,
    ) ?? null
  );
}

/** Append a jot's text to a person's page, blank line between memories. */
export function appendedText(existing: string, addition: string): string {
  const base = existing.replace(/\s+$/, "");
  return base === "" ? addition : `${base}\n\n${addition}`;
}

/** "Jul 19" this year, "Jul 19, 2025" otherwise — the entry date stamp. */
export function entryDateLabel(when: Date, now: Date = new Date()): string {
  return when.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(when.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/**
 * A kept jot lands on a person's page as a dated entry: "Jul 19 · text".
 * Still plain text in one note — the date is part of the body.
 */
export function appendedEntry(
  existing: string,
  text: string,
  when: Date = new Date(),
): string {
  return appendedText(existing, `${entryDateLabel(when)} · ${text}`);
}

/**
 * The quiet countdown cue: "22h" while hours remain, "40m" under one hour.
 * Hours round to nearest so a fresh 24h jot reads "24h" even when the UI
 * clock lags the jot's creation by a few seconds.
 */
export function remainingLabel(expiresAt: number, now: number): string {
  const ms = Math.max(0, expiresAt - now);
  if (ms >= 3600_000) return `${Math.round(ms / 3600_000)}h`;
  return `${Math.max(1, Math.ceil(ms / 60_000))}m`;
}
