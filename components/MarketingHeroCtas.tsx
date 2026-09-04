"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabaseClient } from "@/lib/supabaseClient";

export const POST_JOB_HREF = "/dashboard?tab=jobs&post=1";
export const SIGN_UP_TO_POST_HREF = `/sign-up?next=${encodeURIComponent(POST_JOB_HREF)}`;

/** Homepage CTAs — Post a job respects session (no nav until we know). */
export function MarketingHeroCtas() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (!cancelled) setSignedIn(!!data.session);
    });
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="mt-8 flex flex-col gap-2 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-3">
      {signedIn === null ? (
        <Button className="w-full sm:w-auto" disabled>
          Post a job
        </Button>
      ) : (
        <Link
          href={signedIn ? POST_JOB_HREF : SIGN_UP_TO_POST_HREF}
          className="w-full sm:w-auto"
        >
          <Button className="w-full sm:w-auto">Post a job</Button>
        </Link>
      )}
      <Link href="/jobs" className="w-full sm:w-auto">
        <Button variant="secondary" className="w-full sm:w-auto">
          Find work
        </Button>
      </Link>
    </div>
  );
}
