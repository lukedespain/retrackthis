import Link from "next/link";

/** Agreed mark: black ⌈ + accent ⌋ + center dot (Hazel lockup). */
export function RetrackMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M13 35V13h18"
        className="stroke-[#15141A] dark:stroke-white"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M35 13v22H17"
        stroke="#5B4BFF"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="3.25" className="fill-[#15141A] dark:fill-white" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
    >
      <span className="flex h-7 w-7 items-center justify-center transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95">
        <RetrackMark className="h-7 w-7" />
      </span>
      <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
        Retrack This
      </span>
    </Link>
  );
}
