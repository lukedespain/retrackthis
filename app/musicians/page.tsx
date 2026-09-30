"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CompleteProfileForm } from "@/app/dashboard/CompleteProfileForm";
import { OpenJobsBrowse } from "@/components/OpenJobsBrowse";
import { MarketingFooter } from "@/components/MarketingFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Spinner } from "@/components/ui/Spinner";
import { supabaseClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  name: string;
  role: string[];
  stripeAccountId?: string | null;
  isAdmin?: boolean;
};

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
        const body = await res.json().catch(() => null);
        if (!cancelled) setProfile(body?.profile ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionReady, signedIn]);

  useEffect(() => {
    const payouts = searchParams.get("payouts");
    if (payouts === "return" || payouts === "refresh") {
      router.replace(`/settings?payouts=${payouts}#payouts`);
      return;
    }
    if (searchParams.get("tab") === "submissions") router.replace("/submissions");
  }, [searchParams, router]);

  async function reloadProfile() {
    const res = await fetch("/api/auth/me");
    if (res.status === 401) {
      setProfile(null);
      return;
    }
    const body = await res.json().catch(() => null);
    setProfile(body?.profile ?? null);
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

  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <OpenJobsBrowse signedIn={signedIn} />
      </main>
      <MarketingFooter />
    </>
  );
}
