"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Spinner } from "@/components/ui/Spinner";
import { AccountSettings } from "../AccountSettings";
import { MusicianInstrumentsSettings } from "../MusicianInstrumentsSettings";
import { NotificationSettings } from "../NotificationSettings";
import { ThemeSettings } from "../ThemeSettings";

type Profile = { id: string; name: string; stripeAccountId?: string | null; isAdmin?: boolean };

const SECTIONS = [
  { id: "instruments", label: "Instruments" },
  { id: "notifications", label: "Notifications" },
  { id: "account", label: "Account" },
  { id: "theme", label: "Theme" },
] as const;

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

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    window.requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [profile]);

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

  if (profile === null) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 pb-16 sm:px-6 sm:pb-24">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          ← My jobs
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-gray-500 sm:text-base dark:text-gray-400">
          Instruments, alerts, account, and appearance.
        </p>

        <nav
          aria-label="Settings sections"
          className="mt-5 flex gap-2 overflow-x-auto pb-1 sm:mt-6"
        >
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full bg-gray-100 px-3.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="mt-6 space-y-10 sm:mt-8">
          <section aria-labelledby="instruments-heading" className="scroll-mt-8">
            <h3
              id="instruments-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
            >
              Instruments
            </h3>
            <MusicianInstrumentsSettings />
          </section>

          <section aria-labelledby="notifications-heading" className="scroll-mt-8">
            <h3
              id="notifications-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
            >
              Notifications
            </h3>
            <div id="notifications">
              <NotificationSettings />
            </div>
          </section>

          <section aria-labelledby="account-heading" className="scroll-mt-8">
            <h3
              id="account-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
            >
              Account
            </h3>
            <AccountSettings
              onNameSaved={(name) => setProfile((prev) => (prev ? { ...prev, name } : prev))}
            />
          </section>

          <section aria-labelledby="theme-heading" className="scroll-mt-8">
            <h3
              id="theme-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
            >
              Theme
            </h3>
            <ThemeSettings />
          </section>
        </div>
      </main>
    </div>
  );
}
