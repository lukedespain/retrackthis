/** Brand loader: arms spin around the center; colors flip each half-turn. */
export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md"; className?: string }) {
  const sizeClass = size === "sm" ? "h-5 w-5" : "h-7 w-7";

  return (
    <svg
      className={`retrack-loader ${sizeClass} ${className}`}
      viewBox="0 0 100 100"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <g className="retrack-loader-arms">
        <path
          className="retrack-loader-ink"
          d="M20 60V20h40"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="retrack-loader-accent"
          d="M80 40v40H40"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <circle className="retrack-loader-dot" cx="50" cy="50" r="10" />
    </svg>
  );
}
