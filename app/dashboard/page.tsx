"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { supabaseClient } from "@/lib/supabaseClient";
import { CompleteProfileForm } from "./CompleteProfileForm";
import { CreatorView } from "./CreatorView";
import { MusicianView } from "./MusicianView";

type Role = "CREATOR" | "MUSICIAN";
type Profile = { id: string; name: string; role: Role[] };

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [tab, setTab] = useState<Role | null>(null);

  async function loadProfile() {
    const res = await fetch("/api/auth/me");
    if (res.status === 401) {
      router.push("/sign-in");
      return;
    }
    const { profile } = await res.json();
    setProfile(profile);
    if (profile) setTab((prev) => prev ?? profile.role[0]);
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function signOut() {
    await supabaseClient.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const availableTabs = useMemo(() => profile?.role ?? [], [profile]);
  const activeTab = tab && availableTabs.includes(tab) ? tab : availableTabs[0];

  if (profile === undefined) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-center py-32">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-accent" />
        </div>
      </main>
    );
  }

  if (profile === null) {
    return <CompleteProfileForm onDone={loadProfile} />;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <DashboardHeader
        name={profile.name}
        roles={availableTabs}
        activeRole={activeTab}
        onRoleChange={setTab}
        onSignOut={signOut}
      />

      <div className="mt-10">
        {activeTab === "CREATOR" ? <CreatorView /> : <MusicianView />}
      </div>
    </main>
  );
}
