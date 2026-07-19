import type { Note, Shelf } from "../types";

/**
 * Search everything: stream jots and all three shelves, titles and bodies.
 * Plain case-insensitive substring — fast, predictable, no surprises.
 */

export interface SearchGroup {
  shelf: Shelf;
  notes: Note[];
}

const GROUP_ORDER: Shelf[] = ["stream", "notes", "ideas", "people"];

export function searchNotes(notes: Note[], query: string): SearchGroup[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [];
  const groups: SearchGroup[] = [];
  for (const shelf of GROUP_ORDER) {
    const matches = notes
      .filter(
        (n) =>
          n.shelf === shelf &&
          n.deletedAt === null &&
          (n.title.toLowerCase().includes(q) ||
            n.text.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        shelf === "stream"
          ? b.createdAt - a.createdAt
          : b.updatedAt - a.updatedAt,
      );
    if (matches.length > 0) groups.push({ shelf, notes: matches });
  }
  return groups;
}
