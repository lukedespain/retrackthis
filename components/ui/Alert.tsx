type Variant = "error" | "success" | "warning";

const styles: Record<Variant, string> = {
  error: "border-red-100 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300",
  success:
    "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
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
