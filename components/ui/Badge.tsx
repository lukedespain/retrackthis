const statusStyles: Record<string, string> = {
  OPEN: "open",
  PENDING_PAYMENT: "draft",
  AWARDING: "review",
  CANCELLING: "cancel",
  AWARDED: "awarded",
  CANCELLED: "cancel",
  PENDING: "pending",
  PICKED: "review",
  SELECTED: "awarded",
  "NOT SELECTED": "lost",
  "JOB CANCELLED": "cancel",
};

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  PENDING_PAYMENT: "Draft",
  AWARDING: "Paying",
  CANCELLING: "Cancelling",
  AWARDED: "Picked",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  PICKED: "Favorite",
  SELECTED: "Picked",
  "NOT SELECTED": "Not picked",
  "JOB CANCELLED": "Job cancelled",
};

export function Badge({ status }: { status: string }) {
  const key = status.toUpperCase();
  return <span className={`status ${statusStyles[key] ?? ""}`}>{statusLabels[key] ?? status}</span>;
}
