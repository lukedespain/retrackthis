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
    return <div className="h-8 w-20" aria-hidden />;
  }

  if (signedIn) {
    return (
      <Link href="/dashboard">
        <Button variant="ghost" size="sm">
          Dashboard
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/sign-in">
      <Button variant="ghost" size="sm">
        Sign in
      </Button>
    </Link>
  );
}
