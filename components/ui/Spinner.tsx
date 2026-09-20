import { LOGO_MARK_DARK, LOGO_MARK_LIGHT } from "@/components/Logo";

/** Exact brand mark (light/dark), spinning slowly. */
export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md"; className?: string }) {
  const sizeClass = size === "sm" ? "h-5 w-5" : "h-7 w-7";

  return (
    <span className={`inline-flex ${sizeClass} ${className}`} role="status" aria-label="Loading">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_MARK_LIGHT}
        alt=""
        width={512}
        height={512}
        className={`retrack-loader-spin h-full w-full dark:hidden`}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_MARK_DARK}
        alt=""
        width={512}
        height={512}
        className={`retrack-loader-spin hidden h-full w-full dark:inline-block`}
        draggable={false}
      />
    </span>
  );
}
