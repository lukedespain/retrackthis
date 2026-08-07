const statusStyles: Record<string, string> = {
  OPEN: "bg-emerald-50 text-emerald-700",
  AWARDED: "bg-accent/10 text-accent",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export function Badge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
