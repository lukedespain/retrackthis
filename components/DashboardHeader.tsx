"use client";

import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";
import { RoleToggle } from "./ui/RoleToggle";

type Role = "CREATOR" | "MUSICIAN";

export function DashboardHeader({
  name,
  roles,
  activeRole,
  onRoleChange,
  onSignOut,
}: {
  name: string;
  roles: Role[];
  activeRole: Role;
  onRoleChange: (role: Role) => void;
  onSignOut: () => void;
}) {
  return (
    <header className="border-b border-gray-100 pb-5 sm:pb-6">
      <div className="flex items-center justify-between gap-3">
        <Logo href="/" />
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <RoleToggle roles={roles} active={activeRole} onChange={onRoleChange} />
          <UserMenu name={name} onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  );
}
