const statusStyles: Record<string, string> = {
  OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  AWARDED: "bg-accent-muted text-accent ring-accent/10",
  CANCELLED: "bg-gray-100 text-gray-500 ring-gray-500/10",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/10",
  SELECTED: "bg-accent-muted text-accent ring-accent/10",
  "NOT SELECTED": "bg-gray-100 text-gray-500 ring-gray-500/10",
  "JOB CANCELLED": "bg-gray-100 text-gray-500 ring-gray-500/10",
};

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  AWARDED: "Awarded",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  SELECTED: "Selected",
  "NOT SELECTED": "Not selected",
  "JOB CANCELLED": "Job cancelled",
};

export function Badge({ status }: { status: string }) {
  const key = status.toUpperCase();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[key] ?? "bg-gray-100 text-gray-600 ring-gray-500/10"}`}
    >
      {statusLabels[key] ?? status}
    </span>
  );
}
