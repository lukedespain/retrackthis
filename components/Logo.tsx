import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95">
        r
      </span>
      <span className="text-base font-semibold tracking-tight text-gray-900">retrackthis</span>
    </Link>
  );
}
