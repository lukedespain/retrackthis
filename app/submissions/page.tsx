"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CompleteProfileForm } from "@/app/dashboard/CompleteProfileForm";
import { MySubmissions } from "@/app/dashboard/MySubmissions";
import { AccountHead } from "@/components/brand/AccountHead";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Spinner } from "@/components/ui/Spinner";

type Profile = {
  name: string;
  email: string;
  avatar?: unknown;
};

export default function SubmissionsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  function load() {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/sign-in?next=/submissions");
          return;
        }
        const body = await res.json().catch(() => null);
        setProfile(body?.profile ?? null);
      })
      .catch(() => router.push("/sign-in?next=/submissions"));
  }

  useEffect(() => {
    load();
  }, []);

  if (profile === undefined) {
    return (
      <>
        <main className="wrap">
          <div className="flex justify-center py-24">
            <Spinner />
          </div>
        </main>
      </>
    );
  }

  if (profile === null) return <CompleteProfileForm onDone={load} />;

  return (
    <>
      <main className="wrap">
        <AccountHead
          name={profile.name}
          email={profile.email}
          avatar={profile.avatar}
          current="submissions"
        />
        <Suspense fallback={null}>
          <MySubmissions />
        </Suspense>
      </main>
      <MarketingFooter />
    </>
  );
}
