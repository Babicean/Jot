import { describe, expect, it } from "vitest";
import type { Note } from "../types";
import {
  backupFilename,
  buildBackup,
  mergeBackup,
  parseBackup,
} from "./backup";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    text: "hello",
    title: "",
    createdAt: 1000,
    updatedAt: 1000,
    day: "2026-07-19",
    shelf: "stream",
    expiresAt: null,
    pinned: false,
    checklist: false,
    ticked: [],
    ...overrides,
  };
}

const SETTINGS = {
  theme: "system",
  accent: "azure",
  keyboardReady: true,
} as const;

describe("buildBackup / parseBackup round trip", () => {
  it("round-trips notes and settings", () => {
    const payload = buildBackup(
      [note()],
      { theme: "dark", accent: "blush", keyboardReady: false },
      new Date(2026, 6, 19),
    );
    const parsed = parseBackup(JSON.stringify(payload));
    expect(parsed).not.toBeNull();
    expect(parsed!.notes).toEqual([note()]);
    expect(parsed!.settings).toEqual({
      theme: "dark",
      accent: "blush",
      keyboardReady: false,
    });
  });

  it("names the file after the export day", () => {
    expect(backupFilename(new Date(2026, 6, 19))).toBe(
      "jot-backup-2026-07-19.json",
    );
  });
});

describe("parseBackup — tolerant by design", () => {
  it("rejects only what is not a Jot backup at all", () => {
    expect(parseBackup("not json")).toBeNull();
    expect(parseBackup("{}")).toBeNull();
    expect(parseBackup(JSON.stringify({ app: "tally", notes: [] }))).toBeNull();
    expect(parseBackup(JSON.stringify({ app: "jot" }))).toBeNull();
  });

  it("filters invalid rows instead of rejecting the file", () => {
    const parsed = parseBackup(
      JSON.stringify({
        app: "jot",
        version: 1,
        notes: [note(), { id: "broken" }, 42, null],
        settings: { theme: "purple", accent: 7 },
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.notes).toEqual([note()]);
    expect(parsed!.settings).toEqual(SETTINGS);
  });

  it("survives a backup with no settings block", () => {
    const parsed = parseBackup(JSON.stringify({ app: "jot", notes: [] }));
    expect(parsed!.settings).toEqual(SETTINGS);
  });
});

describe("mergeBackup — union by id, newer updatedAt wins", () => {
  it("adds notes this device does not have", () => {
    const backup = buildBackup([note({ id: "b" })], SETTINGS);
    const result = mergeBackup([note({ id: "a" })], backup);
    expect(result.added).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.notes.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("replaces a local note when the backup copy is newer", () => {
    const local = note({ text: "old", updatedAt: 1000 });
    const incoming = note({ text: "newer", updatedAt: 2000 });
    const result = mergeBackup([local], buildBackup([incoming], SETTINGS));
    expect(result.updated).toBe(1);
    expect(result.notes[0].text).toBe("newer");
  });

  it("keeps local on ties and when local is newer", () => {
    const local = note({ text: "mine", updatedAt: 2000 });
    const tied = note({ text: "theirs", updatedAt: 2000 });
    const older = note({ text: "stale", updatedAt: 500 });
    expect(
      mergeBackup([local], buildBackup([tied], SETTINGS)).notes[0].text,
    ).toBe("mine");
    expect(
      mergeBackup([local], buildBackup([older], SETTINGS)).notes[0].text,
    ).toBe("mine");
  });

  it("importing the same file twice is a no-op", () => {
    const backup = buildBackup([note({ id: "a" }), note({ id: "b" })], SETTINGS);
    const once = mergeBackup([], backup);
    const twice = mergeBackup(once.notes, backup);
    expect(twice.added).toBe(0);
    expect(twice.updated).toBe(0);
    expect(twice.notes).toEqual(once.notes);
  });
});
