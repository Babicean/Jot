import type { DayKey } from "../types";

/**
 * The app's day boundary. A new tracking day starts at 2:00 AM local time,
 * so a late-night snack at 1:15 AM still counts toward the evening before.
 */
export const DAY_BOUNDARY_HOUR = 2;

/** Format a Date's local calendar date as a `YYYY-MM-DD` key. */
export function toDayKey(date: Date): DayKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a `YYYY-MM-DD` key into a local-midnight Date. */
export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * The tracking day a moment in time belongs to.
 * Anything before 2:00 AM local time counts toward the previous calendar day.
 */
export function trackingDayFor(date: Date): DayKey {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (date.getHours() < DAY_BOUNDARY_HOUR) {
    day.setDate(day.getDate() - 1);
  }
  return toDayKey(day);
}

/** Shift a day key by a whole number of days (negative = past). */
export function addDays(key: DayKey, delta: number): DayKey {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + delta);
  return toDayKey(d);
}

/**
 * Milliseconds from `now` until the next 2:00 AM boundary — used to roll the
 * UI over to the new day without a reload.
 */
export function msUntilNextBoundary(now: Date): number {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    DAY_BOUNDARY_HOUR,
    0,
    0,
    0,
  );
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}
