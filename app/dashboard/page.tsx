"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { CompleteProfileForm } from "./CompleteProfileForm";
import { CreatorView } from "./CreatorView";
import { MusicianView } from "./MusicianView";

type Role = "CREATOR" | "MUSICIAN";
type Profile = { id: string; name: string; role: Role[] };

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined); // undefined = loading
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

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          retrackthis
        </Link>
        {profile && (
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{profile.name}</span>
            <button onClick={signOut} className="text-gray-400 hover:text-gray-700">
              Sign out
            </button>
          </div>
        )}
      </header>

      {profile === undefined && <p className="mt-8 text-sm text-gray-400">Loading…</p>}
      {profile === null && <CompleteProfileForm onDone={loadProfile} />}

      {profile && (
        <>
          {availableTabs.length > 1 && (
            <div className="mt-8 flex gap-1 border-b border-gray-100">
              {availableTabs.map((role) => (
                <button
                  key={role}
                  onClick={() => setTab(role)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === role
                      ? "border-b-2 border-accent text-gray-900"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {role === "CREATOR" ? "Creator" : "Musician"}
                </button>
              ))}
            </div>
          )}

          <div className="mt-8">
            {activeTab === "CREATOR" ? <CreatorView /> : <MusicianView />}
          </div>
        </>
      )}
    </main>
  );
}
