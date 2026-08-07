export function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export function formatDeadline(deadline: string | Date) {
  const date = new Date(deadline);
  const isPast = date.getTime() < Date.now();
  const formatted = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return isPast ? `Closed ${formatted}` : `Due ${formatted}`;
}
