import Link from "next/link";

export function RetrackMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Circular retract/repeat arrows */}
      <path
        d="M7.5 7.25A6.25 6.25 0 0 1 18.2 9.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 16.75A6.25 6.25 0 0 1 5.8 14.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18.2 6.1v3.4h-3.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.8 17.9v-3.4h3.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95">
        <RetrackMark className="h-4 w-4" />
      </span>
      <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">RetrackThis</span>
    </Link>
  );
}
