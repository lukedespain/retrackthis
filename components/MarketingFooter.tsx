import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

export function MarketingFooter() {
  return (
    <footer className="foot">
      <Wordmark small />
      <span>© {new Date().getFullYear()} · Retrack your demo with real musicians</span>
      <nav>
        <Link href="/musicians">Find work</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
    </footer>
  );
}
