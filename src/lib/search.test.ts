import { describe, expect, it } from "vitest";
import type { Note } from "../types";
import { searchNotes } from "./search";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    text: "",
    title: "",
    createdAt: 1000,
    updatedAt: 1000,
    day: "2026-07-19",
    shelf: "stream",
    expiresAt: null,
    pinned: false,
    checklist: false,
    ticked: [],
    deletedAt: null,
    ...overrides,
  };
}

const NOTES = [
  note({ id: "j1", text: "buy tulips for ana", createdAt: 2000 }),
  note({ id: "j2", text: "parking level 3", createdAt: 3000 }),
  note({ id: "n1", shelf: "notes", title: "Balcony plan", text: "tulip boxes" }),
  note({ id: "i1", shelf: "ideas", text: "tulip subscription service" }),
  note({ id: "p1", shelf: "people", title: "Ana", text: "loves tulips" }),
  note({ id: "gone", text: "tulip graveyard", deletedAt: 500 }),
];

describe("searchNotes", () => {
  it("matches titles and bodies across everything, grouped in order", () => {
    const groups = searchNotes(NOTES, "tulip");
    expect(groups.map((g) => g.shelf)).toEqual([
      "stream",
      "notes",
      "ideas",
      "people",
    ]);
    expect(groups[0].notes.map((n) => n.id)).toEqual(["j1"]);
  });

  it("is case-insensitive and matches titles too", () => {
    const groups = searchNotes(NOTES, "ANA");
    expect(groups.map((g) => g.shelf)).toEqual(["stream", "people"]);
    expect(groups[1].notes[0].id).toBe("p1");
  });

  it("orders stream matches newest first", () => {
    const groups = searchNotes(NOTES, "l");
    const stream = groups.find((g) => g.shelf === "stream")!;
    expect(stream.notes.map((n) => n.id)).toEqual(["j2", "j1"]);
  });

  it("never surfaces trashed notes", () => {
    const hits = searchNotes(NOTES, "graveyard");
    expect(hits).toEqual([]);
  });

  it("returns nothing for a blank query", () => {
    expect(searchNotes(NOTES, "")).toEqual([]);
    expect(searchNotes(NOTES, "   ")).toEqual([]);
  });

  it("drops empty groups", () => {
    const groups = searchNotes(NOTES, "parking");
    expect(groups.map((g) => g.shelf)).toEqual(["stream"]);
  });
});
