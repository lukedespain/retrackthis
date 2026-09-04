import { MarketingFooter } from "@/components/MarketingFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { JobsMarketplace } from "@/components/JobsMarketplace";

export default function PublicJobsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 pb-16 sm:px-6 sm:pb-24">
        <JobsMarketplace />
      </main>

      <MarketingFooter />
    </div>
  );
}
