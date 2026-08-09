"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OpenJobsBrowse } from "@/components/OpenJobsBrowse";
import { Button } from "@/components/ui/Button";
import { supabaseClient } from "@/lib/supabaseClient";

const POST_HREF = "/dashboard?tab=jobs&post=1";
const SIGN_UP_TO_POST = `/sign-up?next=${encodeURIComponent(POST_HREF)}`;

export function JobsMarketplace() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
    });
  }, []);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Open jobs
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-gray-500 sm:text-base">
            Browse real gigs from producers and songwriters. Create a free account when you&apos;re
            ready to submit a take.
          </p>
        </div>
        <Link href={signedIn ? POST_HREF : SIGN_UP_TO_POST} className="w-full shrink-0 sm:w-auto">
          <Button className="w-full sm:w-auto" disabled={signedIn === null}>
            Post a job
          </Button>
        </Link>
      </div>

      <div className="mt-8 sm:mt-10">
        {signedIn === null ? (
          <div className="h-40" aria-hidden />
        ) : (
          <OpenJobsBrowse signedIn={signedIn} />
        )}
      </div>
    </>
  );
}
