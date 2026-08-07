type Role = "CREATOR" | "MUSICIAN";

const labels: Record<Role, string> = {
  CREATOR: "Creator",
  MUSICIAN: "Musician",
};

export function RoleToggle({
  roles,
  active,
  onChange,
  className = "",
}: {
  roles: Role[];
  active: Role;
  onChange: (role: Role) => void;
  className?: string;
}) {
  if (roles.length <= 1) return null;

  return (
    <div className={`inline-flex rounded-full bg-gray-100 p-0.5 ${className}`}>
      {roles.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => onChange(role)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 active:scale-[0.97] sm:px-3.5 ${
            active === role
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {labels[role]}
        </button>
      ))}
    </div>
  );
}
