import { Logo } from "@/components/Logo";
import { MarketingHeaderActions } from "@/components/MarketingHeaderActions";
import { JobsMarketplace } from "@/components/JobsMarketplace";

export default function PublicJobsPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-6 sm:py-8">
        <Logo />
        <MarketingHeaderActions />
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 sm:px-6 sm:pb-24">
        <JobsMarketplace />
      </main>
    </div>
  );
}
