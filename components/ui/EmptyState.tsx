export function EmptyState({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-surface px-6 py-12 text-center sm:px-8 sm:py-16 dark:border-gray-700 ${className}`}
    >
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
