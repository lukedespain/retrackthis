import { LoopSpinMark } from "@/components/brand/Wordmark";

/** Loop · Spin mark, turning slowly. */
export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md"; className?: string }) {
  const sizeClass = size === "sm" ? "h-5 w-5" : "h-7 w-7";

  return (
    <span className={`inline-flex ${sizeClass} ${className}`} role="status" aria-label="Loading">
      <LoopSpinMark className="retrack-loader-spin h-full w-full" />
    </span>
  );
}
