import type { Note } from "../types";
import { isNote, normalizeNote } from "./notes";
import { isAccent, type Settings } from "./settings";

/**
 * Backup = one JSON file holding everything: notes and settings. Import
 * merges by id, so restoring an old backup never duplicates data. The same
 * payload becomes the sync format if sync ever comes — keep it stable.
 */

export const BACKUP_VERSION = 1;

export interface BackupPayload {
  app: "jot";
  version: number;
  exportedAt: string;
  notes: Note[];
  settings: Settings;
}

export function buildBackup(
  notes: Note[],
  settings: Settings,
  now: Date = new Date(),
): BackupPayload {
  return {
    app: "jot",
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    notes,
    settings,
  };
}

/** Suggested filename, e.g. "jot-backup-2026-07-19.json". */
export function backupFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `jot-backup-${y}-${m}-${d}.json`;
}

/**
 * Parse and validate a backup file. Tolerant on purpose: invalid rows are
 * filtered out, never a reason to reject the whole file. Returns null only
 * for something that isn't a Jot backup at all.
 */
export function parseBackup(json: string): BackupPayload | null {
  try {
    const raw = JSON.parse(json) as Partial<BackupPayload>;
    if (!raw || raw.app !== "jot" || !Array.isArray(raw.notes)) {
      return null;
    }
    const theme = raw.settings?.theme;
    const accent = raw.settings?.accent;
    const keyboardReady = raw.settings?.keyboardReady;
    return {
      app: "jot",
      version: typeof raw.version === "number" ? raw.version : 1,
      exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
      notes: raw.notes.filter(isNote).map(normalizeNote),
      settings: {
        theme: theme === "light" || theme === "dark" ? theme : "system",
        accent: isAccent(accent) ? accent : "azure",
        keyboardReady:
          typeof keyboardReady === "boolean" ? keyboardReady : true,
      },
    };
  } catch {
    return null;
  }
}

export interface MergeResult {
  notes: Note[];
  /** Notes the backup added that this device didn't have. */
  added: number;
  /** Existing notes replaced by a newer copy from the backup. */
  updated: number;
}

/**
 * Merge a backup into current data. Union by id; when both sides have the
 * same note, the newer `updatedAt` wins and ties stay local. Safe to run
 * repeatedly — importing the same file twice is a no-op.
 */
export function mergeBackup(current: Note[], backup: BackupPayload): MergeResult {
  const byId = new Map(current.map((n) => [n.id, n]));
  let added = 0;
  let updated = 0;
  const merged = [...current];
  for (const incoming of backup.notes) {
    const local = byId.get(incoming.id);
    if (!local) {
      merged.push(incoming);
      added += 1;
    } else if (incoming.updatedAt > local.updatedAt) {
      merged[merged.indexOf(local)] = incoming;
      updated += 1;
    }
  }
  return { notes: merged, added, updated };
}
