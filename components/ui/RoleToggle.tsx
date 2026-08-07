type Role = "CREATOR" | "MUSICIAN";

const labels: Record<Role, string> = {
  CREATOR: "Creator",
  MUSICIAN: "Musician",
};

export function RoleToggle({
  roles,
  active,
  onChange,
}: {
  roles: Role[];
  active: Role;
  onChange: (role: Role) => void;
}) {
  if (roles.length <= 1) return null;

  return (
    <div className="inline-flex rounded-full bg-gray-100 p-0.5">
      {roles.map((role) => (
        <button
          key={role}
          onClick={() => onChange(role)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
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
