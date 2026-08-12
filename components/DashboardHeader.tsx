"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";
import { Button } from "./ui/Button";

export function DashboardHeader({
  name,
  hasStripeAccount = false,
  onSignOut,
}: {
  name: string;
  hasStripeAccount?: boolean;
  onSignOut: () => void;
}) {
  return (
    <header className="border-b border-gray-100 pb-5 sm:pb-6">
      <div className="flex items-center justify-between gap-3">
        <Logo href="/" />
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <Link href="/jobs">
            <Button variant="ghost" size="sm">
              Browse jobs
            </Button>
          </Link>
          <UserMenu name={name} hasStripeAccount={hasStripeAccount} onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  );
}
