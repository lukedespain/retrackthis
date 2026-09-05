"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/Button";
import { supabaseClient } from "@/lib/supabaseClient";

type Profile = {
  name: string;
  stripeAccountId?: string | null;
  isAdmin?: boolean;
};

/**
 * Site-wide header — same shell on marketing, jobs, and account pages.
 * Signed out: Browse jobs + Sign in. Signed in: Browse jobs + hamburger (no Dashboard CTA).
 */
export function SiteHeader({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabaseClient.auth.getSession();
      const session = data.session;
      if (cancelled) return;

      if (!session) {
        setSignedIn(false);
        setProfile(null);
        setReady(true);
        return;
      }

      setSignedIn(true);
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const body = await res.json();
          if (!cancelled) setProfile(body.profile ?? null);
        }
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    load();

    const { data: sub } = supabaseClient.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabaseClient.auth.signOut();
    setSignedIn(false);
    setProfile(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className={`mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-6 sm:py-8 ${className}`}
    >
      <Logo href="/" />
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {!ready ? (
          <div className="h-9 w-9" aria-hidden />
        ) : signedIn ? (
          <UserMenu
            name={profile?.name ?? "Account"}
            isAdmin={Boolean(profile?.isAdmin)}
            onSignOut={signOut}
          />
        ) : (
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
