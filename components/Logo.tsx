import Link from "next/link";

/** Exact Figma exports — never redraw. */
export const LOGO_MARK_LIGHT = "/brand/retrackthis-icon-light-512.png";
export const LOGO_MARK_DARK = "/brand/retrackthis-icon-dark-512.png";
/** @deprecated use LOGO_MARK_LIGHT — kept for spinner/email default */
export const LOGO_MARK_SRC = LOGO_MARK_LIGHT;

export function RetrackMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_MARK_LIGHT}
        alt=""
        width={512}
        height={512}
        className={`${className} dark:hidden`}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_MARK_DARK}
        alt=""
        width={512}
        height={512}
        className={`hidden ${className} dark:inline-block`}
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
        <RetrackMark className="h-7 w-7" />
      </span>
      <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
        Retrack <span className="text-accent">This</span>
      </span>
    </Link>
  );
}
