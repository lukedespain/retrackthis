import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MarketingHeaderActions } from "@/components/MarketingHeaderActions";
import { OpenJobsBrowse } from "@/components/OpenJobsBrowse";

export default function PublicJobsPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-6 sm:py-8">
        <Logo />
        <MarketingHeaderActions />
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 sm:px-6 sm:pb-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Open jobs
            </h1>
            <p className="mt-1.5 max-w-lg text-sm text-gray-500 sm:text-base">
              Browse real gigs from producers and songwriters. Create a free account when you&apos;re
              ready to submit a take.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
          >
            ← Back home
          </Link>
        </div>

        <div className="mt-8 sm:mt-10">
          <OpenJobsBrowse signedIn={false} />
        </div>
      </main>
    </div>
  );
}
