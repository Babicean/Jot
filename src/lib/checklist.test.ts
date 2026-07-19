import { describe, expect, it } from "vitest";
import {
  addChecklistItem,
  checklistItems,
  checklistSummary,
  toggleTick,
} from "./checklist";

const BODY = "milk\ncoffee filters\n\nbread";

describe("checklistItems", () => {
  it("turns non-empty lines into items, keeping raw indices", () => {
    const items = checklistItems(BODY, []);
    expect(items.map((i) => [i.index, i.label])).toEqual([
      [0, "milk"],
      [1, "coffee filters"],
      [3, "bread"],
    ]);
  });

  it("sinks ticked items below unticked, each side in written order", () => {
    const items = checklistItems(BODY, [0]);
    expect(items.map((i) => i.label)).toEqual([
      "coffee filters",
      "bread",
      "milk",
    ]);
    expect(items[2].ticked).toBe(true);
  });
});

describe("toggleTick", () => {
  it("ticks and unticks, keeping the list sorted", () => {
    expect(toggleTick([], 3)).toEqual([3]);
    expect(toggleTick([3], 0)).toEqual([0, 3]);
    expect(toggleTick([0, 3], 3)).toEqual([0]);
  });
});

describe("checklistSummary", () => {
  it("counts done of total over non-empty lines", () => {
    expect(checklistSummary(BODY, [0, 3])).toEqual({ done: 2, total: 3 });
    expect(checklistSummary(BODY, [])).toEqual({ done: 0, total: 3 });
  });

  it("ignores stale indices after the text was edited down", () => {
    expect(checklistSummary("milk", [0, 7])).toEqual({ done: 1, total: 1 });
    expect(checklistSummary(BODY, [2])).toEqual({ done: 0, total: 3 });
  });
});

describe("addChecklistItem", () => {
  it("appends a trimmed line, starting the list if empty", () => {
    expect(addChecklistItem("", "  milk ")).toBe("milk");
    expect(addChecklistItem("milk", "bread")).toBe("milk\nbread");
    expect(addChecklistItem("milk\n", "bread")).toBe("milk\nbread");
  });

  it("ignores blank items", () => {
    expect(addChecklistItem("milk", "   ")).toBe("milk");
  });
});
