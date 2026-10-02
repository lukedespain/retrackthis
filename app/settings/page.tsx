"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { AccountHead } from "@/components/brand/AccountHead";
import { AvatarBuilder } from "@/components/brand/AvatarBuilder";
import { MarketingFooter } from "@/components/MarketingFooter";
import { PayoutSetupCard } from "@/components/PayoutSetupCard";
import { avatarSvg, cleanAvatar, randomAvatar } from "@/lib/avatar";
import { Spinner } from "@/components/ui/Spinner";
import { AccountSettings } from "@/app/dashboard/AccountSettings";
import { MusicianInstrumentsSettings } from "@/app/dashboard/MusicianInstrumentsSettings";
import { FeatureRequestSettings } from "@/app/dashboard/FeatureRequestSettings";
import { NotificationSettings } from "@/app/dashboard/NotificationSettings";

type Profile = {
  id: string;
  name: string;
  email: string;
  avatar?: unknown;
  stripeAccountId?: string | null;
  isAdmin?: boolean;
};

function SettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [payoutsHighlight, setPayoutsHighlight] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/sign-in?next=/settings");
          return;
        }
        const body = await res.json().catch(() => null);
        if (!body?.profile) {
          router.push("/producers");
          return;
        }
        setProfile(body.profile);
      })
      .catch(() => {
        router.push("/sign-in?next=/settings");
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
        <main className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
          <div className="flex items-center justify-center py-24">
            <Spinner />
          </div>
        </main>
      </div>
    );
  }

  if (profile === null) return null;

  const avatar = cleanAvatar(profile.avatar);

  return (
    <>
      <main className="wrap">
        <AccountHead
          name={profile.name}
          email={profile.email}
          avatar={profile.avatar}
          current="settings"
        />

        <div className="settings">
        <div>
        {!avatar ? (
          <AvatarInvite onClick={() => setBuilderOpen(true)} />
        ) : null}

          <section className="card" id="payouts">
            <h2>Payouts</h2>
            <p>Where your winnings go when a producer picks your take.</p>
            <PayoutSetupCard highlightReturn={payoutsHighlight} allowManage compact />
          </section>

          <section className="card" id="instruments">
            <h2>What you play</h2>
            <p>We use this to show you the right gigs and let you know about new ones.</p>
            <MusicianInstrumentsSettings />
          </section>

          <section className="card" id="notifications">
            <h2>Notifications</h2>
            <p>Choose what we keep you posted on. Changes save automatically.</p>
            <NotificationSettings />
          </section>

          <section className="card" id="ideas">
            <h2>Request a feature</h2>
            <p>Anything you’d like on the site. We’ll review it and leave a note here.</p>
            <FeatureRequestSettings />
          </section>

          <section className="card" id="account">
            <h2>Account</h2>
            <p>Your name is shown on jobs and takes.</p>
            <AccountSettings
              onNameSaved={(name) => setProfile((prev) => (prev ? { ...prev, name } : prev))}
            />
          </section>
        </div>
        </div>
      </main>
      <MarketingFooter />
      <AvatarBuilder
        open={builderOpen}
        initial={avatar}
        name={profile.name}
        onClose={() => setBuilderOpen(false)}
        onSaved={(next) => {
          setProfile((prev) => (prev ? { ...prev, avatar: next } : prev));
          window.dispatchEvent(new CustomEvent("rt-avatar-saved", { detail: next }));
          setBuilderOpen(false);
        }}
      />
    </>
  );
}

function AvatarInvite({ onClick }: { onClick: () => void }) {
  const uid = useId();
  const faces = useMemo(
    () =>
      ["Maya Chen", "Theo Alvarez", "Jun Park", "Ana Ruiz"].map((name, i) =>
        avatarSvg(randomAvatar(i + 3), `${uid}-${name}`)
      ),
    [uid]
  );
  return (
    <button type="button" className="av-invite" id="profile" onClick={onClick}>
      <span className="av-invite-faces">
        {faces.map((html, i) => (
          <i key={i} style={{ "--i": i } as CSSProperties} dangerouslySetInnerHTML={{ __html: html }} />
        ))}
      </span>
      <span className="av-invite-copy">
        <strong>Make your avatar</strong>
        <span>Hair, headphones, the works.</span>
      </span>
      <span className="av-invite-go">Let&apos;s go</span>
    </button>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
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
