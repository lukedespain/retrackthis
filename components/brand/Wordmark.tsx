import Link from "next/link";

/** Loop · Spin: two arcs chasing a dot. Ink on top, accent underneath. */
export function LoopSpinMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M9 24 A15 15 0 0 1 29.13 9.9 L26.4 4.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M39 24 A15 15 0 0 1 18.87 38.1 L21.6 43.9"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="5.4" fill="currentColor" />
    </svg>
  );
}

export function BadgeMark() {
  return (
    <span className="mark" aria-hidden="true">
      <LoopSpinMark />
    </span>
  );
}

export function Wordmark({ small = false, href = "/" }: { small?: boolean; href?: string }) {
  return (
    <Link className={small ? "wordmark sm" : "wordmark"} href={href} aria-label="Retrack This">
      <BadgeMark />
      <span>
        Retrack <b>This</b>
      </span>
    </Link>
  );
}
