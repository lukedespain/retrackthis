"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Spinner } from "@/components/ui/Spinner";

/** Legacy /dashboard URLs → Producers / Musicians hubs. */
export default function DashboardRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <SiteHeader />
          <main className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
            <div className="flex items-center justify-center py-24">
              <Spinner />
            </div>
          </main>
        </div>
      }
    >
      <DashboardRedirectInner />
    </Suspense>
  );
}

function DashboardRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    const post = searchParams.get("post");
    const payouts = searchParams.get("payouts");

    if (tab === "submissions" || payouts === "return" || payouts === "refresh") {
      const params = new URLSearchParams();
      params.set("tab", "submissions");
      if (payouts) params.set("payouts", payouts);
      router.replace(`/musicians?${params.toString()}`);
      return;
    }

    if (tab === "post" || post === "1") {
      router.replace("/producers?tab=post");
      return;
    }

    router.replace("/producers");
  }, [router, searchParams]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
        <div className="flex items-center justify-center py-24">
          <Spinner />
        </div>
      </main>
    </div>
  );
}
