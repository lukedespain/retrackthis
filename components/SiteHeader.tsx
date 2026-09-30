"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { PostJobForm } from "@/app/dashboard/PostJobForm";
import { Avatar } from "@/components/brand/Avatar";
import { avatarForName } from "@/lib/avatar";
import { Wordmark } from "@/components/brand/Wordmark";
import { JOB_POSTED, OPEN_POST_JOB } from "@/components/MarketingHeroCtas";
import { supabaseClient } from "@/lib/supabaseClient";

type Profile = {
  name: string;
  email: string;
  isAdmin?: boolean;
  avatar?: unknown;
};

type MineJob = {
  status: string;
  deadline: string;
  _count?: { takes: number };
  takes?: { id: string }[];
};

async function fetchProfile(): Promise<Profile | null> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  return (body?.profile as Profile | null) ?? null;
}

async function fetchToPick(): Promise<number> {
  const res = await fetch("/api/jobs?mine=true");
  if (!res.ok) return 0;
  const jobs = (await res.json().catch(() => [])) as MineJob[];
  if (!Array.isArray(jobs)) return 0;
  const now = Date.now();
  return jobs.filter(
    (j) =>
      j.status === "OPEN" &&
      new Date(j.deadline).getTime() <= now &&
      (j._count?.takes ?? 0) > 0 &&
      !(j.takes && j.takes.length)
  ).length;
}

const PLUS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Site-wide header: wordmark, Find work, Post a job, and the account menu. */
export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [toPick, setToPick] = useState(0);
  const [submissions, setSubmissions] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const acctRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabaseClient.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setSignedIn(false);
        setProfile(null);
        setToPick(0);
        setSubmissions(null);
        setReady(true);
        return;
      }
      setSignedIn(true);
      try {
        let next = await fetchProfile();
        if (!next) {
          // Cookie/session can lag the client session briefly after auth events.
          await new Promise((r) => setTimeout(r, 200));
          if (cancelled) return;
          next = await fetchProfile();
        }
        if (cancelled) return;
        setProfile(next);
        if (next) {
          setToPick(await fetchToPick().catch(() => 0));
          const takes = await fetch("/api/takes/mine")
            .then((res) => (res.ok ? res.json() : []))
            .catch(() => []);
          if (!cancelled) setSubmissions(Array.isArray(takes) ? takes.length : 0);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    const { data: sub } = supabaseClient.auth.onAuthStateChange(() => void load());
    const onAvatar = (e: Event) => {
      const avatar = (e as CustomEvent).detail;
      setProfile((p) => (p ? { ...p, avatar } : p));
    };
    window.addEventListener("rt-avatar-saved", onAvatar);
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener("rt-avatar-saved", onAvatar);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const openJob = () => setPostOpen(true);
    window.addEventListener(OPEN_POST_JOB, openJob);
    return () => window.removeEventListener(OPEN_POST_JOB, openJob);
  }, []);

  async function signOut() {
    setOpen(false);
    await supabaseClient.auth.signOut();
    setSignedIn(false);
    setProfile(null);
    router.push("/");
    router.refresh();
  }

  const hasAvatar = profile?.avatar != null;
  const inAccount = ["/producers", "/submissions", "/settings"].some((p) => pathname.startsWith(p));
  const label = ["Your account", toPick ? `${toPick} to pick` : "", !hasAvatar ? "make your avatar" : ""]
    .filter(Boolean)
    .join(", ");

  return (
    <header className={scrolled ? "nav scrolled" : "nav"} id="nav">
      <Wordmark />
      <div className="nav-right">
        <nav className="nav-links">
          <Link href="/musicians" aria-current={pathname.startsWith("/musicians") ? "page" : undefined}>
            Find work
          </Link>
        </nav>
        {!ready ? (
          <span style={{ width: 36, height: 36 }} aria-hidden="true" />
        ) : signedIn ? (
          <>
            <button type="button" className="btn primary" onClick={() => setPostOpen(true)}>
              {PLUS} Post a job
            </button>
            <div className="acct" ref={acctRef}>
              <button
                ref={btnRef}
                type="button"
                className={inAccount ? "avatar art on" : "avatar art"}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={label}
                onClick={() => setOpen((v) => !v)}
              >
                <Avatar avatar={profile?.avatar ?? null} name={profile?.name ?? ""} bare />
                {toPick || !hasAvatar ? <i className="dot" /> : null}
              </button>
              {open ? (
                <div className="menu" role="menu">
                  <div className="menu-me">
                    <strong>{profile?.name || "Your account"}</strong>
                    <span>{profile?.email}</span>
                  </div>
                  {!hasAvatar ? (
                    <Link role="menuitem" className="menu-nudge" href="/settings#profile" onClick={() => setOpen(false)}>
                      <NudgeFaces />
                      <span>Make your avatar</span>
                    </Link>
                  ) : null}
                  <Link role="menuitem" href="/producers" onClick={() => setOpen(false)}>
                    My jobs {toPick ? <span className="status review">{toPick} to pick</span> : null}
                  </Link>
                  <Link role="menuitem" href="/submissions" onClick={() => setOpen(false)}>
                    My submissions
                    {submissions != null ? <span className="count">{submissions}</span> : null}
                  </Link>
                  <Link role="menuitem" href="/settings">
                    Settings
                  </Link>
                  {profile?.isAdmin ? (
                    <Link role="menuitem" href="/admin">
                      Admin
                    </Link>
                  ) : null}
                  <hr />
                  <a
                    role="menuitem"
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      void signOut();
                    }}
                  >
                    Sign out
                  </a>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <Link className="btn primary" href="/producers?tab=post">
              Post a job
            </Link>
            <Link className="btn outline" href="/sign-in">
              Sign in
            </Link>
          </>
        )}
      </div>
      {postOpen ? (
        <PostJobForm
          onCancel={() => setPostOpen(false)}
          onPosted={() => {
            setPostOpen(false);
            window.dispatchEvent(new Event(JOB_POSTED));
            if (!pathname.startsWith("/producers")) router.push("/producers");
          }}
        />
      ) : null}
    </header>
  );
}

const NUDGE_NAMES = ["Maya Chen", "Theo Alvarez", "Jun Park"];

function NudgeFaces() {
  const uid = useId();
  return (
    <span className="nudge-avs">
      {NUDGE_NAMES.map((name) => (
        <i key={name} dangerouslySetInnerHTML={{ __html: avatarForName(name, `${uid}-${name}`) }} />
      ))}
    </span>
  );
}
