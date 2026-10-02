import Link from "next/link";

/**
 * Badge · Offset: brand fill, clean line, circle frame.
 * The black disc sits down-right; the purple face presses into it on hover.
 */
export function BadgeMark() {
  return (
    <span className="mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" overflow="visible">
        <g className="mark-shadow">
          <circle cx="24" cy="24" r="22" fill="currentColor" transform="translate(2.6 2.6)" />
        </g>
        <g className="mark-face">
          <circle cx="24" cy="24" r="22" fill="var(--mark-accent, var(--accent))" />
          <g transform="translate(9.25 5.25) scale(.75)">
            <path
              d="M7 13h2.5a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V15a2 2 0 0 1 2-2z"
              fill="var(--mark-on-accent, #fff)"
            />
            <path
              d="M14 25L35 13L35 37Z"
              fill="var(--mark-on-accent, #fff)"
              stroke="var(--mark-on-accent, #fff)"
              strokeWidth="3.4"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </svg>
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
