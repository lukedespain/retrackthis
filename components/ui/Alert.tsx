type Variant = "error" | "success" | "warning" | "info";

const styles: Record<Variant, string> = {
  error: "border-red-100 bg-red-50 text-red-700",
  success:
    "border-emerald-100 bg-emerald-50 text-emerald-700",
  warning:
    "border-amber-100 bg-amber-50 text-amber-800",
  info: "border-sky-100 bg-sky-50 text-sky-800",
};

export function Alert({
  variant,
  children,
  className = "",
}: {
  variant: Variant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed transition-opacity duration-200 ${styles[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
