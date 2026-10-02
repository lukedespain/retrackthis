/** Loading status with no spinning mark. The offset badge is the logo, not a loader. */
export function Spinner({ className = "" }: { size?: "sm" | "md"; className?: string }) {
  return (
    <span className={`sr-only ${className}`} role="status">
      Loading
    </span>
  );
}
