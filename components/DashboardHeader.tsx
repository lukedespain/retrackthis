"use client";

import { Logo } from "./Logo";
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
    <header className="flex items-center justify-between border-b border-gray-100 pb-6">
      <Logo />
      <div className="flex items-center gap-4">
        <RoleToggle roles={roles} active={activeRole} onChange={onRoleChange} />
        <div className="hidden h-5 w-px bg-gray-200 sm:block" />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-gray-500 sm:inline">{name}</span>
          <button
            onClick={onSignOut}
            className="text-sm text-gray-400 transition-colors hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
