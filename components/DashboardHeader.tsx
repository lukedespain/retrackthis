"use client";

import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";

/** @deprecated Prefer SiteHeader — kept for gradual migration. */
export function DashboardHeader({
  name,
  hasStripeAccount = false,
  isAdmin = false,
  onSignOut,
}: {
  name: string;
  hasStripeAccount?: boolean;
  isAdmin?: boolean;
  onSignOut: () => void;
}) {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-6 sm:py-8">
      <Logo href="/" />
      <UserMenu
        name={name}
        hasStripeAccount={hasStripeAccount}
        isAdmin={isAdmin}
        onSignOut={onSignOut}
      />
    </header>
  );
}
