import { addDays, format, startOfWeek } from "date-fns";

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const sameYear = weekStart.getFullYear() === end.getFullYear();
  if (sameMonth) return `${format(weekStart, "MMM d")} – ${format(end, "d, yyyy")}`;
  if (sameYear) return `${format(weekStart, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  return `${format(weekStart, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];