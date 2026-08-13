"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Spinner } from "@/components/ui/Spinner";
import { supabaseClient } from "@/lib/supabaseClient";
import { NotificationSettings } from "../NotificationSettings";

type Profile = { id: string; name: string; stripeAccountId?: string | null };

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (res.status === 401) {
        router.push("/sign-in?next=/dashboard/settings");
        return;
      }
      const body = await res.json();
      if (!body.profile) {
        router.push("/dashboard");
        return;
      }
      setProfile(body.profile);
    });
  }, [router]);

  async function signOut() {
    await supabaseClient.auth.signOut();
    router.push("/");
    router.refresh();
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

  if (profile === null) return null;

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <DashboardHeader
        name={profile.name}
        hasStripeAccount={Boolean(profile.stripeAccountId)}
        onSignOut={signOut}
      />

      <div className="mt-8 sm:mt-10">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Dashboard
        </Link>
        <h2 className="mt-3 text-lg font-semibold text-gray-900">Settings</h2>
        <p className="mt-0.5 text-sm text-gray-500">Choose which emails you want from RetrackThis.</p>
      </div>

      <div className="mt-6 sm:mt-8">
        <NotificationSettings />
      </div>
    </main>
  );
}
