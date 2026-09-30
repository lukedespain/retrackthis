"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FIND_WORK_HREF, requestPostJob, SIGN_UP_TO_POST_HREF } from "@/components/MarketingHeroCtas";
import { supabaseClient } from "@/lib/supabaseClient";

/** Post a job waits for the session check so signed-out visitors go through sign-up first. */
export function HomeHeroCtas() {
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
    <div className="ctas">
      {signedIn === null ? (
        <button type="button" className="btn primary" disabled>
          Post a job
        </button>
      ) : (
        signedIn ? (
          <button type="button" className="btn primary" onClick={requestPostJob}>
            Post a job
          </button>
        ) : (
          <Link href={SIGN_UP_TO_POST_HREF} className="btn primary">
            Post a job
          </Link>
        )
      )}
      <Link href={FIND_WORK_HREF} className="btn outline">
        Find work
      </Link>
    </div>
  );
}
