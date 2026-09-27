export function TestJobBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-700"
      title="Test job: admins only, no payment, no emails"
    >
      <span aria-hidden="true">🧪</span>
      Test
    </span>
  );
}
