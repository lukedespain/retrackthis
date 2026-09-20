import Link from "next/link";

/** Hazel mark — naturally wider than tall; never force into a square. */
export function RetrackMark({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/retrackthis-mark-site-transparent.png"
        alt=""
        width={154}
        height={100}
        className={`${className} dark:hidden`}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/retrackthis-mark-site-on-dark.png"
        alt=""
        width={154}
        height={100}
        className={`hidden dark:inline-block ${className}`}
        draggable={false}
      />
    </>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
    >
      <span className="inline-flex transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95">
        <RetrackMark className="h-7 w-auto" />
      </span>
      <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
        Retrack This
      </span>
    </Link>
  );
}
