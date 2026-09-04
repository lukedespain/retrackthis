import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/MarketingFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-5 pb-16 sm:px-6 sm:pb-24">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-gray-400">Last updated {updated}</p>
        <div className="legal-prose mt-10 space-y-8 text-sm leading-relaxed text-gray-600 sm:text-base">
          {children}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}
