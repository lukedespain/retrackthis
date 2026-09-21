"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CompleteProfileForm } from "@/app/dashboard/CompleteProfileForm";
import { CreatorView } from "@/app/dashboard/CreatorView";
import { PostJobForm } from "@/app/dashboard/PostJobForm";
import { RoleHubHeader } from "@/components/RoleHubHeader";
import { SiteHeader } from "@/components/SiteHeader";
import { Spinner } from "@/components/ui/Spinner";

type Profile = {
  id: string;
  name: string;
  role: string[];
  stripeAccountId?: string | null;
  isAdmin?: boolean;
};

type ProducerTab = "post" | "jobs";

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
  const [tab, setTab] = useState<ProducerTab>("jobs");
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
    const tabParam = searchParams.get("tab");
    if (tabParam === "post" || searchParams.get("post") === "1") setTab("post");
    else setTab("jobs");
  }, [searchParams]);

  // After Stripe Checkout success/cancel, land on My jobs and confirm activation.
  useEffect(() => {
    const jobId = searchParams.get("job");
    const posted = searchParams.get("posted") === "1";
    const cancelled = searchParams.get("checkout") === "cancelled";
    if (!jobId && !posted && !cancelled) return;

    setTab("jobs");
    setJobsKey((k) => k + 1);

    if (posted && jobId) {
      void fetch(`/api/jobs/${jobId}/confirm-checkout`, { method: "POST" })
        .then(() => setJobsKey((k) => k + 1))
        .catch(() => {});
    }

    router.replace("/producers", { scroll: false });
  }, [searchParams, router]);

  function changeTab(next: ProducerTab) {
    setTab(next);
    router.replace(next === "post" ? "/producers?tab=post" : "/producers", { scroll: false });
  }

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
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-2 sm:px-6 sm:pb-24 sm:pt-4">
        <RoleHubHeader
          title="Producers"
          description="Post a gig, pay upfront at checkout, then pay out the musician when you pick a winner."
          options={[
            { value: "post" as const, label: "Post a job" },
            { value: "jobs" as const, label: "My jobs" },
          ]}
          value={tab}
          onChange={changeTab}
        />

        <div className="mt-8 sm:mt-10">
          {tab === "post" ? (
            <PostJobForm
              onCancel={() => changeTab("jobs")}
              onPosted={() => {
                setJobsKey((k) => k + 1);
                changeTab("jobs");
              }}
            />
          ) : (
            <CreatorView key={jobsKey} hideHeading hidePostButton />
          )}
        </div>
      </main>
    </div>
  );
}
