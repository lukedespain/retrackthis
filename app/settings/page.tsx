"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { PayoutSetupCard } from "@/components/PayoutSetupCard";
import { Spinner } from "@/components/ui/Spinner";
import { AccountSettings } from "@/app/dashboard/AccountSettings";
import { MusicianInstrumentsSettings } from "@/app/dashboard/MusicianInstrumentsSettings";
import { NotificationSettings } from "@/app/dashboard/NotificationSettings";
import { ThemeSettings } from "@/app/dashboard/ThemeSettings";

type Profile = { id: string; name: string; stripeAccountId?: string | null; isAdmin?: boolean };

const SECTIONS = [
  { id: "payouts", label: "Payouts" },
  { id: "instruments", label: "Instruments" },
  { id: "notifications", label: "Email" },
  { id: "account", label: "Account" },
  { id: "theme", label: "Theme" },
] as const;

function SettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [payoutsHighlight, setPayoutsHighlight] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (res.status === 401) {
        router.push("/sign-in?next=/settings");
        return;
      }
      const body = await res.json();
      if (!body.profile) {
        router.push("/producers");
        return;
      }
      setProfile(body.profile);
    });
  }, [router]);

  useEffect(() => {
    const payouts = searchParams.get("payouts");
    if (payouts === "return" || payouts === "refresh") {
      setPayoutsHighlight(true);
      window.requestAnimationFrame(() => {
        document.getElementById("payouts")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      router.replace("/settings#payouts", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    function scrollToHash() {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      window.requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
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

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-2 sm:px-6 sm:pb-24 sm:pt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-gray-500 sm:text-base dark:text-gray-400">
          Payouts, instruments, email alerts, account, and appearance.
        </p>

        <nav
          aria-label="Settings sections"
          className="mt-5 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-6 sm:px-0"
        >
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-gray-100 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="mt-6 space-y-10 sm:mt-8">
          <section aria-labelledby="payouts-heading" className="scroll-mt-8">
            <h3
              id="payouts-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
            >
              Payouts
            </h3>
            <div id="payouts">
              <PayoutSetupCard highlightReturn={payoutsHighlight} allowManage />
            </div>
          </section>

          <section aria-labelledby="instruments-heading" className="scroll-mt-8">
            <h3
              id="instruments-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
            >
              Instruments
            </h3>
            <div id="instruments">
              <MusicianInstrumentsSettings />
            </div>
          </section>

          <section aria-labelledby="notifications-heading" className="scroll-mt-8">
            <h3
              id="notifications-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
            >
              Email notifications
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
            <div id="account">
              <AccountSettings
                onNameSaved={(name) => setProfile((prev) => (prev ? { ...prev, name } : prev))}
              />
            </div>
          </section>

          <section aria-labelledby="theme-heading" className="scroll-mt-8">
            <h3
              id="theme-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400"
            >
              Theme
            </h3>
            <div id="theme">
              <ThemeSettings />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
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
      <SettingsPageInner />
    </Suspense>
  );
}
