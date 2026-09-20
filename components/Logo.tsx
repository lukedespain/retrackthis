import Link from "next/link";

export function RetrackMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="20 34 60 36" fill="none" aria-hidden="true">
      {/* Two rotationally-symmetric corner strokes handing off around a center dot */}
      <path
        d="M29 63 L29 52 A11 11 0 0 1 40 41 L50 41"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M71 41 L71 52 A11 11 0 0 1 60 63 L50 63"
        stroke="#5B4BFF"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="52" r="4" fill="currentColor" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
    >
      <RetrackMark className="h-7 w-7 text-gray-900 transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95 dark:text-white" />
      <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">Retrack This</span>
    </Link>
  );
}
