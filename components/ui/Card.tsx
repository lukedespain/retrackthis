import { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  selected?: boolean;
};

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
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
      className={`rounded-2xl bg-white shadow-card transition-all duration-150 ease-out dark:shadow-card-dark ${paddingMap[padding]} ${
        selected ? "ring-2 ring-accent/30 shadow-card-hover" : ""
      } ${
        hover
          ? "cursor-pointer hover:shadow-card-hover hover:ring-1 hover:ring-gray-200/80 active:scale-[0.995] dark:hover:ring-gray-700"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
