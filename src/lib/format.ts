import type { DayKey } from "../types";
import { fromDayKey, trackingDayFor, addDays } from "./day";

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Today", "Yesterday", or e.g. "Friday, July 10" for this year's dates. */
export function formatDayLabel(day: DayKey, now: Date = new Date()): string {
  const today = trackingDayFor(now);
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  const date = fromDayKey(day);
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
