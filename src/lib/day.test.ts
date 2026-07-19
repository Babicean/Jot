import { describe, expect, it } from "vitest";
import {
  addDays,
  fromDayKey,
  msUntilNextBoundary,
  toDayKey,
  trackingDayFor,
} from "./day";

describe("trackingDayFor — the 2 AM day boundary", () => {
  it("counts a normal afternoon toward the same calendar day", () => {
    expect(trackingDayFor(new Date(2026, 6, 4, 14, 30))).toBe("2026-07-04");
  });

  it("counts midnight toward the previous day", () => {
    expect(trackingDayFor(new Date(2026, 6, 4, 0, 0, 0))).toBe("2026-07-03");
  });

  it("counts 1:59:59 AM toward the previous day", () => {
    expect(trackingDayFor(new Date(2026, 6, 4, 1, 59, 59))).toBe("2026-07-03");
  });

  it("counts exactly 2:00 AM toward the new day", () => {
    expect(trackingDayFor(new Date(2026, 6, 4, 2, 0, 0))).toBe("2026-07-04");
  });

  it("counts 2:00:01 AM toward the new day", () => {
    expect(trackingDayFor(new Date(2026, 6, 4, 2, 0, 1))).toBe("2026-07-04");
  });

  it("rolls back across a month boundary", () => {
    expect(trackingDayFor(new Date(2026, 7, 1, 1, 30))).toBe("2026-07-31");
  });

  it("rolls back across a year boundary", () => {
    expect(trackingDayFor(new Date(2026, 0, 1, 0, 45))).toBe("2025-12-31");
  });

  it("handles a leap day", () => {
    expect(trackingDayFor(new Date(2028, 2, 1, 1, 0))).toBe("2028-02-29");
  });
});

describe("day key helpers", () => {
  it("round-trips keys through Date", () => {
    expect(toDayKey(fromDayKey("2026-07-04"))).toBe("2026-07-04");
    expect(toDayKey(fromDayKey("2026-01-09"))).toBe("2026-01-09");
  });

  it("adds and subtracts days across month edges", () => {
    expect(addDays("2026-07-04", -6)).toBe("2026-06-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("msUntilNextBoundary", () => {
  it("targets 2 AM tomorrow when it is already past 2 AM", () => {
    const now = new Date(2026, 6, 4, 15, 0, 0);
    const ms = msUntilNextBoundary(now);
    expect(new Date(now.getTime() + ms).getHours()).toBe(2);
    expect(ms).toBe(11 * 3600_000); // 15:00 → 02:00 next day
  });

  it("targets 2 AM today when it is just after midnight", () => {
    const now = new Date(2026, 6, 4, 1, 0, 0);
    expect(msUntilNextBoundary(now)).toBe(3600_000);
  });

  it("never returns zero or negative at the boundary itself", () => {
    const now = new Date(2026, 6, 4, 2, 0, 0);
    expect(msUntilNextBoundary(now)).toBe(24 * 3600_000);
  });
});
