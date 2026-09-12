export function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days remaining until deadline (floor). Negative when past. */
export function daysUntilDeadline(deadline: string | Date): number {
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.floor(ms / DAY_MS);
}

/** Pill / UI copy: "3 days left", "1 day left", "Less than a day left", or "Closed …". */
export function formatDeadline(deadline: string | Date) {
  const date = new Date(deadline);
  const ms = date.getTime() - Date.now();
  if (ms < 0) {
    const formatted = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `Closed ${formatted}`;
  }
  if (ms < DAY_MS) return "Less than a day left";
  const days = Math.floor(ms / DAY_MS);
  return days === 1 ? "1 day left" : `${days} days left`;
}
