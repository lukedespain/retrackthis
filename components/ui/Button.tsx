import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
};

const variants = {
  primary: "btn primary",
  secondary: "btn primary",
  outline: "btn outline",
  ghost: "btn soft",
  danger: "btn text hover:!text-red-600",
};

const sizes = {
  sm: "!h-9 !px-4 !text-[13.5px]",
  md: "",
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: Props) {
  return (
    <button
      className={`${variants[variant]} ${sizes[size]} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    />
  );
}
