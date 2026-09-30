"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/brand/Avatar";
import { AvatarBuilder } from "@/components/brand/AvatarBuilder";
import type { AvatarSettings } from "@/lib/avatar";
import { cleanAvatar } from "@/lib/avatar";

const TABS = [
  { id: "jobs", href: "/producers", label: "My jobs" },
  { id: "submissions", href: "/submissions", label: "My submissions" },
  { id: "settings", href: "/settings", label: "Settings" },
] as const;

export function AccountHead({
  name,
  email,
  avatar,
  current,
}: {
  name: string;
  email: string;
  avatar: unknown;
  current: (typeof TABS)[number]["id"];
}) {
  const [saved, setSaved] = useState<AvatarSettings | null>(cleanAvatar(avatar));
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<number | null>(null);
  const [subs, setSubs] = useState<number | null>(null);

  useEffect(() => {
    setSaved(cleanAvatar(avatar));
  }, [avatar]);

  useEffect(() => {
    fetch("/api/jobs?mine=true")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setJobs(Array.isArray(body) ? body.length : null))
      .catch(() => setJobs(null));
    fetch("/api/takes/mine")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setSubs(Array.isArray(body) ? body.length : null))
      .catch(() => setSubs(null));
  }, []);

  const counts: Record<string, number | null> = { jobs, submissions: subs };

  return (
    <>
      <div className="acct-head">
        <div className="acct-id">
          <button
            type="button"
            className="avatar lg art edit"
            aria-label="Customize your avatar"
            onClick={() => setOpen(true)}
          >
            <Avatar avatar={saved} name={name} bare />
            <i className="pen" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4 11.5-11.5z" />
              </svg>
            </i>
          </button>
          <div>
            <h1>{name}</h1>
            <p>{email}</p>
          </div>
        </div>
      </div>
      <nav className="tabs acct-tabs" aria-label="Account">
        {TABS.map((tab) => (
          <Link key={tab.id} href={tab.href} aria-current={tab.id === current ? "page" : undefined}>
            {tab.label}
            {counts[tab.id] != null ? <span className="count">{counts[tab.id]}</span> : null}
          </Link>
        ))}
      </nav>
      <AvatarBuilder
        open={open}
        initial={saved}
        name={name}
        onClose={() => setOpen(false)}
        onSaved={(next) => {
          setSaved(next);
          window.dispatchEvent(new CustomEvent("rt-avatar-saved", { detail: next }));
        }}
      />
    </>
  );
}
