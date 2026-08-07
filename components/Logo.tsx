import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white transition-transform group-hover:scale-105">
        r
      </span>
      <span className="text-base font-semibold tracking-tight text-gray-900">retrackthis</span>
    </Link>
  );
}
