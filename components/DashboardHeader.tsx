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
    <header className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between sm:pb-6">
      <Logo />
      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-4">
        <RoleToggle roles={roles} active={activeRole} onChange={onRoleChange} />
        <div className="hidden h-5 w-px bg-gray-200 sm:block" />
        <div className="flex items-center gap-3">
          <span className="max-w-[10rem] truncate text-sm text-gray-500 sm:max-w-none">{name}</span>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-lg px-1 text-sm text-gray-400 transition-colors duration-150 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
