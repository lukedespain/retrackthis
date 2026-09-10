import Link from "next/link";
import { Logo } from "@/components/Logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-gray-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-10">
        <Logo />
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
          <Link href="/terms" className="hover:text-gray-900">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-gray-900">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
