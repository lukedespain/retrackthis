import { TextareaHTMLAttributes, forwardRef } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, hint, className = "", id, ...props },
  ref
) {
  const inputId = id ?? props.name;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-150 ease-out hover:border-gray-300 focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600 dark:disabled:bg-gray-900"
        {...props}
      />
      {hint && <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  );
});
