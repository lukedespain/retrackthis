"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabaseClient } from "@/lib/supabaseClient";

export function MarketingHeaderActions() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
    });
  }, []);

  if (signedIn === null) {
    return <div className="h-8 w-28" aria-hidden />;
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link href="/jobs">
        <Button variant="ghost" size="sm">
          Browse jobs
        </Button>
      </Link>
      {signedIn ? (
        <Link href="/dashboard">
          <Button size="sm">Dashboard</Button>
        </Link>
      ) : (
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
      )}
    </div>
  );
}
