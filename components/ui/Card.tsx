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
      className={`rounded-[24px] bg-white shadow-[0_0_0_1px_var(--line)] transition-all duration-150 ease-out ${paddingMap[padding]} ${
        selected ? "!shadow-[0_0_0_1.5px_var(--ink)]" : ""
      } ${
        hover
          ? "cursor-pointer hover:shadow-[0_0_0_1px_var(--line-2),0_18px_40px_-24px_rgba(17,17,19,.3)] active:scale-[0.995]"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
