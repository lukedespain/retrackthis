/** Brand badge mark, spinning slowly. */
export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md"; className?: string }) {
  const sizeClass = size === "sm" ? "h-5 w-5" : "h-7 w-7";

  return (
    <span className={`inline-flex ${sizeClass} ${className}`} role="status" aria-label="Loading">
      <svg viewBox="0 0 48 48" className="retrack-loader-spin h-full w-full" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="var(--accent)" />
        <rect x="13" y="15" width="4.6" height="18" rx="1.4" fill="#fff" />
        <path d="M19.6 24L34 15L34 33Z" fill="#fff" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
