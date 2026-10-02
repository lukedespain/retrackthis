"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CompleteProfileForm } from "@/app/dashboard/CompleteProfileForm";
import { OpenJobsBrowse } from "@/components/OpenJobsBrowse";
import { MarketingFooter } from "@/components/MarketingFooter";
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
    <Suspense fallback={null}>
      <MusiciansPageInner />
    </Suspense>
  );
}

function MusiciansPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSignedIn(!!data.session);
    });
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!signedIn) return;
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
  }, [signedIn]);

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

  if (signedIn && profile === null) {
    return <CompleteProfileForm onDone={reloadProfile} />;
  }

  return (
    <>
      <main className="wrap">
        <OpenJobsBrowse signedIn={signedIn} />
      </main>
      <MarketingFooter />
    </>
  );
}
