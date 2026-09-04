"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Spinner } from "@/components/ui/Spinner";
import { CompleteProfileForm } from "./CompleteProfileForm";
import { CreatorView } from "./CreatorView";
import { MySubmissions } from "./MySubmissions";

type Profile = {
  id: string;
  name: string;
  role: string[];
  stripeAccountId?: string | null;
  isAdmin?: boolean;
};
type DashTab = "jobs" | "submissions";

export default function DashboardPage() {
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
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [tab, setTab] = useState<DashTab>("jobs");
  const [openPost, setOpenPost] = useState(false);
  const [payoutsHighlight, setPayoutsHighlight] = useState(false);

  async function loadProfile() {
    const res = await fetch("/api/auth/me");
    if (res.status === 401) {
      router.push("/sign-in");
      return;
    }
    const { profile } = await res.json();
    setProfile(profile);
  }

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "submissions") setTab("submissions");
    else if (tabParam === "jobs") setTab("jobs");

    if (searchParams.get("post") === "1") {
      setTab("jobs");
      setOpenPost(true);
    }

    const payouts = searchParams.get("payouts");
    if (payouts === "return" || payouts === "refresh") {
      setTab("submissions");
      setPayoutsHighlight(true);
      router.replace("/dashboard?tab=submissions", { scroll: false });
    }
  }, [searchParams, router]);

  function changeTab(next: DashTab) {
    setTab(next);
    if (next !== "jobs") setOpenPost(false);

    if (next === "submissions") {
      router.replace("/dashboard?tab=submissions", { scroll: false });
      return;
    }
    if (openPost) {
      router.replace("/dashboard?tab=jobs&post=1", { scroll: false });
      return;
    }
    router.replace("/dashboard", { scroll: false });
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

      <main className="mx-auto max-w-5xl px-5 pb-16 sm:px-6 sm:pb-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
              {tab === "jobs" ? "My jobs" : "My submissions"}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 sm:text-base dark:text-gray-400">
              {tab === "jobs"
                ? "Manage your posted gigs and review takes"
                : "Track the status of your submitted takes"}
            </p>
          </div>
          <SegmentedControl
            options={[
              { value: "jobs" as const, label: "My jobs" },
              { value: "submissions" as const, label: "My submissions" },
            ]}
            value={tab}
            onChange={changeTab}
            className="self-start"
          />
        </div>

        <div className="mt-8 sm:mt-10">
          {tab === "jobs" ? (
            <CreatorView
              initialShowPost={openPost}
              hideHeading
              onPostClosed={() => {
                setOpenPost(false);
                router.replace("/dashboard", { scroll: false });
              }}
            />
          ) : (
            <MySubmissions payoutsHighlight={payoutsHighlight} />
          )}
        </div>
      </main>
    </div>
  );
}
