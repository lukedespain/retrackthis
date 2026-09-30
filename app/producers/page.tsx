"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CompleteProfileForm } from "@/app/dashboard/CompleteProfileForm";
import { CreatorView } from "@/app/dashboard/CreatorView";
import { AccountHead } from "@/components/brand/AccountHead";
import { JOB_POSTED, requestPostJob } from "@/components/MarketingHeroCtas";
import { MarketingFooter } from "@/components/MarketingFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Spinner } from "@/components/ui/Spinner";

type Profile = {
  id: string;
  name: string;
  email: string;
  avatar?: unknown;
  role: string[];
  stripeAccountId?: string | null;
  isAdmin?: boolean;
};

export default function ProducersPage() {
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
      <ProducersPageInner />
    </Suspense>
  );
}

function ProducersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [jobsKey, setJobsKey] = useState(0);

  async function loadProfile() {
    const res = await fetch("/api/auth/me");
    if (res.status === 401) {
      router.push("/sign-in?next=/producers");
      return;
    }
    const body = await res.json().catch(() => null);
    setProfile(body?.profile ?? null);
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  useEffect(() => {
    if (searchParams.get("tab") === "post" || searchParams.get("post") === "1") {
      requestPostJob();
      router.replace("/producers", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    const refresh = () => setJobsKey((k) => k + 1);
    window.addEventListener(JOB_POSTED, refresh);
    return () => window.removeEventListener(JOB_POSTED, refresh);
  }, []);

  // After Stripe Checkout success/cancel, land on My jobs and confirm activation.
  useEffect(() => {
    const jobId = searchParams.get("job");
    const posted = searchParams.get("posted") === "1";
    const cancelled = searchParams.get("checkout") === "cancelled";
    if (!jobId && !posted && !cancelled) return;

    setJobsKey((k) => k + 1);

    if (posted && jobId) {
      void fetch(`/api/jobs/${jobId}/confirm-checkout`, { method: "POST" })
        .then(() => setJobsKey((k) => k + 1))
        .catch(() => {});
    }

    router.replace("/producers", { scroll: false });
  }, [searchParams, router]);

  if (profile === undefined) {
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

  if (profile === null) {
    return <CompleteProfileForm onDone={loadProfile} />;
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="wrap">
        <AccountHead
          name={profile.name}
          email={profile.email}
          avatar={profile.avatar}
          current="jobs"
        />
        <CreatorView key={jobsKey} hideHeading hidePostButton />
      </main>
      <MarketingFooter />
    </div>
  );
}
