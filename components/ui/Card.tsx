import { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  selected?: boolean;
};

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  padding = "md",
  hover = false,
  selected = false,
  className = "",
  children,
  ...props
}: Props) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-card transition-all ${paddingMap[padding]} ${
        selected ? "ring-2 ring-accent/30 shadow-card-hover" : ""
      } ${hover ? "hover:shadow-card-hover cursor-pointer" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
