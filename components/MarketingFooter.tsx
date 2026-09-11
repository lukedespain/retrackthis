import Link from "next/link";
import { Logo } from "@/components/Logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-gray-100">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-5 py-8 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6 sm:px-6 sm:py-10">
        <div className="sm:justify-self-start">
          <Logo />
        </div>
        <p className="whitespace-nowrap text-sm font-medium text-accent sm:text-center">
          The bridge between producers and musicians
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 sm:justify-end">
          <Link href="/faq" className="hover:text-gray-900">
            FAQ
          </Link>
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
