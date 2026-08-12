"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Spinner } from "@/components/ui/Spinner";
import { supabaseClient } from "@/lib/supabaseClient";
import { CompleteProfileForm } from "./CompleteProfileForm";
import { CreatorView } from "./CreatorView";
import { MySubmissions } from "./MySubmissions";

type Profile = { id: string; name: string; role: string[] };
type DashTab = "jobs" | "submissions";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
          <div className="flex items-center justify-center py-32">
            <Spinner />
          </div>
        </main>
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
      // Drop the query flag so refresh doesn't keep flashing.
      router.replace("/dashboard?tab=submissions", { scroll: false });
    }
  }, [searchParams, router]);

  async function signOut() {
    await supabaseClient.auth.signOut();
    router.push("/");
    router.refresh();
  }

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
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="flex items-center justify-center py-32">
          <Spinner />
        </div>
      </main>
    );
  }

  if (profile === null) {
    return <CompleteProfileForm onDone={loadProfile} />;
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <DashboardHeader name={profile.name} onSignOut={signOut} />

      <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {tab === "jobs" ? "My jobs" : "My submissions"}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
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

      <div className="mt-6 sm:mt-8">
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
  );
}
