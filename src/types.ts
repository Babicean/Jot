/** A local calendar day in `YYYY-MM-DD` form (the *tracking* day, 2 AM boundary). */
export type DayKey = string;

/** Where a note lives: the capture stream, or one of the Library shelves. */
export type Shelf = "stream" | "notes" | "ideas" | "people";

export const LIBRARY_SHELVES = ["notes", "ideas", "people"] as const;
export type LibraryShelf = (typeof LIBRARY_SHELVES)[number];

/**
 * The one record type. A jot is a Note on the "stream" shelf; keeping it
 * just moves `shelf`. One array, one storage key, sync-ready.
 */
export interface Note {
  id: string;
  /** Body text. For future checklists, one item per line. */
  text: string;
  /** "" for jots; the person's name on the People shelf; optional elsewhere. */
  title: string;
  /** Epoch ms when first captured. */
  createdAt: number;
  /** Epoch ms of the last edit; drives merge conflicts. */
  updatedAt: number;
  /** Tracking day the note was captured on (2 AM local boundary). */
  day: DayKey;
  shelf: Shelf;
  /** Stream only: epoch ms when the jot silently vanishes. null = never. */
  expiresAt: number | null;
  /** Library shelves only: pinned notes sort first. */
  pinned: boolean;
  /** Reserved for checklist mode (not in v0.1); render lines as tickable items. */
  checklist: boolean;
  /** Reserved for checklist mode: indices of ticked lines. */
  ticked: number[];
  /**
   * Epoch ms when the note was deleted into the Trash; null = live.
   * Trash purges after 30 days. Expired disappearing jots skip the
   * Trash entirely (no graveyard is their point).
   */
  deletedAt: number | null;
}
