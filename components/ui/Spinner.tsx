export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md"; className?: string }) {
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div
      className={`animate-spin rounded-full border-2 border-gray-200 border-t-accent ${sizeClass} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
