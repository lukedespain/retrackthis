import Link from "next/link";

const ARM_PROPS = {
  strokeWidth: 10,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

/** Main mark — purple center (Hazel). Square. */
export function RetrackMark({
  className = "h-7 w-7",
  inkClassName = "stroke-[#15141A] dark:stroke-white",
  accent = "#5B4BFF",
  center = "purple",
}: {
  className?: string;
  inkClassName?: string;
  accent?: string;
  center?: "purple" | "black";
}) {
  const centerFill =
    center === "purple" ? accent : undefined;
  const centerClass =
    center === "black" ? "fill-[#15141A] dark:fill-white" : undefined;

  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path d="M20 60V20h40" className={inkClassName} {...ARM_PROPS} />
      <path d="M80 40v40H40" stroke={accent} {...ARM_PROPS} />
      <circle cx="50" cy="50" r="10" fill={centerFill} className={centerClass} />
    </svg>
  );
}

/** Banner lockup — arms frame the wordmark (special / marketing). */
export function LogoWordmark({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 480 140" fill="none" aria-hidden="true">
      <path
        d="M28 88V28h72"
        className="stroke-[#15141A] dark:stroke-white"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M452 52v60H380"
        stroke="#5B4BFF"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="240"
        y="78"
        textAnchor="middle"
        className="fill-[#15141A] dark:fill-white"
        style={{
          fontFamily:
            "var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
          fontSize: 52,
          fontWeight: 700,
          letterSpacing: "-1.2px",
        }}
      >
        Retrack <tspan fill="#5B4BFF">This</tspan>
      </text>
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
    >
      <span className="inline-flex transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95">
        <RetrackMark className="h-7 w-7" />
      </span>
      <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
        Retrack <span className="text-accent">This</span>
      </span>
    </Link>
  );
}
