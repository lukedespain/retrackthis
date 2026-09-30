import Link from "next/link";

export function BadgeMark() {
  return (
    <span className="mark" aria-hidden="true">
      <svg viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="22" fill="var(--accent)" />
        <rect x="13" y="15" width="4.6" height="18" rx="1.4" fill="#fff" />
        <path d="M19.6 24L34 15L34 33Z" fill="#fff" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />
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
