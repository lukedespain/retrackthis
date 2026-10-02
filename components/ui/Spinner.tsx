/** Quiet wait. The offset badge is the logo, not a loader. */
export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md"; className?: string }) {
  const text = size === "sm" ? "text-xs text-gray-400" : "text-sm text-gray-500";
  return (
    <p className={`${text} ${className}`} role="status">
      Loading…
    </p>
  );
}