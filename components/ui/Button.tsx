import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const variants = {
  primary:
    "bg-accent text-white shadow-sm hover:bg-accent-hover active:bg-accent-hover disabled:hover:bg-accent",
  secondary:
    "bg-gray-900 text-white shadow-sm hover:bg-gray-800 active:bg-gray-950 disabled:hover:bg-gray-900 dark:bg-[#f3f4f6] dark:text-[#111827] dark:hover:bg-white dark:active:bg-white dark:disabled:hover:bg-[#f3f4f6]",
  ghost:
    "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white dark:active:bg-gray-700",
  danger:
    "bg-transparent text-gray-400 hover:bg-red-50 hover:text-red-600 active:bg-red-100 disabled:hover:bg-transparent dark:hover:bg-red-950/40 dark:hover:text-red-400 dark:active:bg-red-950/60",
};

const sizes = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 dark:focus-visible:ring-offset-gray-950 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
