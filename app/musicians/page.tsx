"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CompleteProfileForm } from "@/app/dashboard/CompleteProfileForm";
import { MySubmissions } from "@/app/dashboard/MySubmissions";
import { OpenJobsBrowse } from "@/components/OpenJobsBrowse";
import { RoleHubHeader } from "@/components/RoleHubHeader";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { supabaseClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  name: string;
  role: string[];
  stripeAccountId?: string | null;
  isAdmin?: boolean;
};

type MusicianTab = "browse" | "submissions";

export default function MusiciansPage() {
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
      <MusiciansPageInner />
    </Suspense>
  );
}

function MusiciansPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [tab, setTab] = useState<MusicianTab>("browse");
  const [payoutsHighlight, setPayoutsHighlight] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSignedIn(!!data.session);
      setSessionReady(true);
    });
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
      setSessionReady(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    if (!signedIn) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.status === 401) {
          if (!cancelled) setProfile(null);
          return;
        }
        const body = await res.json();
        if (!cancelled) setProfile(body.profile ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionReady, signedIn]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "submissions") setTab("submissions");
    else setTab("browse");

    const payouts = searchParams.get("payouts");
    if (payouts === "return" || payouts === "refresh") {
      setTab("submissions");
      setPayoutsHighlight(true);
      router.replace("/musicians?tab=submissions", { scroll: false });
    }
  }, [searchParams, router]);

  function changeTab(next: MusicianTab) {
    setTab(next);
    router.replace(next === "submissions" ? "/musicians?tab=submissions" : "/musicians", {
      scroll: false,
    });
  }

  async function reloadProfile() {
    const res = await fetch("/api/auth/me");
    if (res.status === 401) {
      setProfile(null);
      return;
    }
    const body = await res.json();
    setProfile(body.profile ?? null);
  }

  if (!sessionReady) {
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

  if (signedIn && profile === undefined) {
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

  if (signedIn && profile === null) {
    return <CompleteProfileForm onDone={reloadProfile} />;
  }

  const submissionsLocked = tab === "submissions" && !signedIn;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-16 sm:px-6 sm:pb-24">
        <RoleHubHeader
          title="Musicians"
          description="Browse open gigs, submit takes for free, and track what you’ve sent. Multiple musicians can submit. The producer picks who to pay."
          options={[
            { value: "browse" as const, label: "Browse jobs" },
            { value: "submissions" as const, label: "My submissions" },
          ]}
          value={tab}
          onChange={changeTab}
        />

        <div className="mt-8 sm:mt-10">
          {tab === "browse" ? (
            <OpenJobsBrowse signedIn={signedIn} />
          ) : submissionsLocked ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center dark:border-gray-800 dark:bg-gray-950 sm:px-6">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Sign in to see the takes you’ve submitted.
              </p>
              <Link
                href={`/sign-in?next=${encodeURIComponent("/musicians?tab=submissions")}`}
                className="mt-4 inline-block"
              >
                <Button size="sm">Sign in</Button>
              </Link>
            </div>
          ) : (
            <MySubmissions payoutsHighlight={payoutsHighlight} />
          )}
        </div>
      </main>
    </div>
  );
}
