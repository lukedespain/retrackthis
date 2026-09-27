import Link from "next/link";
import { Logo } from "@/components/Logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-gray-100 dark:border-gray-800">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-4 px-5 py-8 text-center sm:px-6 sm:py-10">
        <Logo />
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/faq" className="hover:text-gray-900 dark:hover:text-white">
            FAQ
          </Link>
          <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
