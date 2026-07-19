import { describe, expect, it } from "vitest";
import type { Note } from "../types";
import {
  appendedText,
  createJot,
  createLibraryNote,
  findPerson,
  groupStream,
  isNote,
  libraryNotes,
  nextExpiryChoice,
  peopleNames,
  remainingLabel,
  streamNotes,
  sweepExpired,
} from "./notes";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? crypto.randomUUID(),
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

describe("isNote — strict validation", () => {
  it("accepts a well-formed note", () => {
    expect(isNote(note())).toBe(true);
  });

  it("rejects junk and near-misses", () => {
    expect(isNote(null)).toBe(false);
    expect(isNote("string")).toBe(false);
    expect(isNote({})).toBe(false);
    expect(isNote(note({ id: "" }))).toBe(false);
    expect(isNote({ ...note(), text: 5 })).toBe(false);
    expect(isNote({ ...note(), day: "not-a-day" })).toBe(false);
    expect(isNote({ ...note(), shelf: "junk" })).toBe(false);
    expect(isNote({ ...note(), expiresAt: "soon" })).toBe(false);
    expect(isNote({ ...note(), ticked: [1, "two"] })).toBe(false);
    expect(isNote({ ...note(), pinned: "yes" })).toBe(false);
  });
});

describe("createJot", () => {
  it("lands on the stream with the tracking day precomputed", () => {
    const j = createJot("  buy milk  ", 0, new Date(2026, 6, 19, 14, 0));
    expect(j.shelf).toBe("stream");
    expect(j.text).toBe("buy milk");
    expect(j.title).toBe("");
    expect(j.day).toBe("2026-07-19");
    expect(j.expiresAt).toBeNull();
  });

  it("stamps a 1 AM thought onto the evening before", () => {
    const j = createJot("late idea", 0, new Date(2026, 6, 19, 1, 15));
    expect(j.day).toBe("2026-07-18");
  });

  it("computes expiry from the chosen hours", () => {
    const when = new Date(2026, 6, 19, 12, 0);
    const j = createJot("parked on level 3", 24, when);
    expect(j.expiresAt).toBe(when.getTime() + 24 * 3600_000);
    const k = createJot("parked on level 3", 48, when);
    expect(k.expiresAt).toBe(when.getTime() + 48 * 3600_000);
  });
});

describe("nextExpiryChoice — the capture-bar cycle", () => {
  it("cycles off → 24h → 48h → off", () => {
    expect(nextExpiryChoice(0)).toBe(24);
    expect(nextExpiryChoice(24)).toBe(48);
    expect(nextExpiryChoice(48)).toBe(0);
  });
});

describe("sweepExpired", () => {
  it("silently removes expired stream jots", () => {
    const notes = [
      note({ id: "a", expiresAt: 900 }),
      note({ id: "b", expiresAt: 2000 }),
      note({ id: "c", expiresAt: null }),
    ];
    const result = sweepExpired(notes, 1000);
    expect(result.removed).toBe(1);
    expect(result.notes.map((n) => n.id)).toEqual(["b", "c"]);
  });

  it("treats the expiry instant itself as expired", () => {
    const result = sweepExpired([note({ id: "a", expiresAt: 1000 })], 1000);
    expect(result.removed).toBe(1);
  });

  it("never touches kept notes, even with a stale expiresAt", () => {
    const kept = note({ id: "a", shelf: "notes", expiresAt: 900 });
    const result = sweepExpired([kept], 1000);
    expect(result.removed).toBe(0);
    expect(result.notes).toEqual([kept]);
  });

  it("is a no-op on an empty list", () => {
    expect(sweepExpired([], 1000)).toEqual({ notes: [], removed: 0 });
  });
});

describe("streamNotes / groupStream", () => {
  it("orders the stream oldest first, like a chat", () => {
    const notes = [
      note({ id: "b", createdAt: 2000 }),
      note({ id: "a", createdAt: 1000 }),
      note({ id: "kept", createdAt: 1500, shelf: "ideas" }),
    ];
    expect(streamNotes(notes).map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("groups consecutive days with ascending headers", () => {
    const notes = [
      note({ id: "a", createdAt: 1, day: "2026-07-18" }),
      note({ id: "b", createdAt: 2, day: "2026-07-18" }),
      note({ id: "c", createdAt: 3, day: "2026-07-19" }),
    ];
    const groups = groupStream(notes);
    expect(groups.map((g) => g.day)).toEqual(["2026-07-18", "2026-07-19"]);
    expect(groups[0].notes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(groups[1].notes.map((n) => n.id)).toEqual(["c"]);
  });
});

describe("libraryNotes", () => {
  const shelf = [
    note({ id: "old", shelf: "notes", updatedAt: 1000 }),
    note({ id: "new", shelf: "notes", updatedAt: 3000 }),
    note({ id: "pinned", shelf: "notes", updatedAt: 500, pinned: true }),
    note({ id: "idea", shelf: "ideas", updatedAt: 2000 }),
    note({ id: "jot", shelf: "stream" }),
  ];

  it("puts pinned first, then newest updated", () => {
    expect(libraryNotes(shelf, "all").map((n) => n.id)).toEqual([
      "pinned",
      "new",
      "idea",
      "old",
    ]);
  });

  it("filters by shelf and never shows the stream", () => {
    expect(libraryNotes(shelf, "ideas").map((n) => n.id)).toEqual(["idea"]);
    expect(libraryNotes(shelf, "all").some((n) => n.id === "jot")).toBe(false);
  });
});

describe("People — one page per person", () => {
  const people = [
    note({ id: "ana", shelf: "people", title: "Ana", text: "loves tulips" }),
    note({ id: "mira", shelf: "people", title: "Mira", text: "" }),
    note({ id: "n", shelf: "notes", title: "Ana" }),
  ];

  it("finds a person by name, case-insensitively", () => {
    expect(findPerson(people, "ana")?.id).toBe("ana");
    expect(findPerson(people, "  ANA ")?.id).toBe("ana");
    expect(findPerson(people, "nobody")).toBeNull();
    expect(findPerson(people, "")).toBeNull();
  });

  it("never matches a Notes-shelf title", () => {
    expect(findPerson([note({ shelf: "notes", title: "Bo" })], "Bo")).toBeNull();
  });

  it("lists names alphabetically for suggestions", () => {
    expect(peopleNames(people)).toEqual(["Ana", "Mira"]);
  });

  it("appends with a blank line between memories", () => {
    expect(appendedText("loves tulips", "birthday in May")).toBe(
      "loves tulips\n\nbirthday in May",
    );
    expect(appendedText("", "first memory")).toBe("first memory");
    expect(appendedText("trailing\n\n", "next")).toBe("trailing\n\nnext");
  });
});

describe("remainingLabel — the quiet countdown cue", () => {
  it("shows whole hours while at least an hour remains", () => {
    expect(remainingLabel(24 * 3600_000, 0)).toBe("24h");
    expect(remainingLabel(24 * 3600_000, 2 * 3600_000 + 1)).toBe("22h");
    expect(remainingLabel(3600_000, 0)).toBe("1h");
  });

  it("reads 24h on a fresh 24h jot even when the UI clock lags", () => {
    expect(remainingLabel(24 * 3600_000 + 30_000, 0)).toBe("24h");
  });

  it("switches to minutes under an hour, never showing 0m", () => {
    expect(remainingLabel(3600_000, 1)).toBe("60m");
    expect(remainingLabel(40 * 60_000, 0)).toBe("40m");
    expect(remainingLabel(1000, 999)).toBe("1m");
    expect(remainingLabel(1000, 5000)).toBe("1m");
  });
});

describe("createLibraryNote", () => {
  it("creates directly onto a shelf with a trimmed title", () => {
    const n = createLibraryNote("ideas", "  Big one ", "text");
    expect(n.shelf).toBe("ideas");
    expect(n.title).toBe("Big one");
    expect(n.expiresAt).toBeNull();
  });
});
