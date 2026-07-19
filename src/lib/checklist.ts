/**
 * Checklist mode: a note's text stays one dumb string, one item per line.
 * `ticked` holds the indices of ticked lines (into the raw line split), so
 * a checklist is still a plain, mergeable, exportable note.
 */

export interface ChecklistItem {
  /** Index into the raw line split — the identity used for ticking. */
  index: number;
  label: string;
  ticked: boolean;
}

/** Raw lines of a checklist body; index positions are the tick identities. */
function rawLines(text: string): string[] {
  return text.split("\n");
}

/**
 * The items to render: blank lines are skipped, unticked items first in
 * their written order, ticked items sink below in theirs.
 */
export function checklistItems(text: string, ticked: number[]): ChecklistItem[] {
  const set = new Set(ticked);
  const items = rawLines(text)
    .map((line, index) => ({ index, label: line.trim(), ticked: set.has(index) }))
    .filter((item) => item.label !== "");
  return [...items.filter((i) => !i.ticked), ...items.filter((i) => i.ticked)];
}

/** Toggle one line's tick, returning a fresh sorted index list. */
export function toggleTick(ticked: number[], index: number): number[] {
  const set = new Set(ticked);
  if (set.has(index)) set.delete(index);
  else set.add(index);
  return [...set].sort((a, b) => a - b);
}

/** "N of M" data for a note row. Stale indices (edited text) count zero. */
export function checklistSummary(
  text: string,
  ticked: number[],
): { done: number; total: number } {
  const lines = rawLines(text);
  const valid = (i: number) => i >= 0 && i < lines.length && lines[i].trim() !== "";
  return {
    done: ticked.filter(valid).length,
    total: lines.filter((l) => l.trim() !== "").length,
  };
}

/** Append a new item line to the body. */
export function addChecklistItem(text: string, item: string): string {
  const trimmed = item.trim();
  if (trimmed === "") return text;
  const base = text.replace(/\s+$/, "");
  return base === "" ? trimmed : `${base}\n${trimmed}`;
}
