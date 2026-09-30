import { Wordmark } from "@/components/brand/Wordmark";

/** Exact Figma exports - never redraw. */
export const LOGO_MARK_LIGHT = "/brand/retrackthis-icon-light-512.png";
export const LOGO_MARK_DARK = "/brand/retrackthis-icon-dark-512.png";
/** @deprecated use LOGO_MARK_LIGHT - kept for spinner/email default */
export const LOGO_MARK_SRC = LOGO_MARK_LIGHT;

export function RetrackMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_MARK_LIGHT}
        alt=""
        width={512}
        height={512}
        className={`${className}`}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_MARK_DARK}
        alt=""
        width={512}
        height={512}
        className={`hidden ${className}`}
        draggable={false}
      />
    </>
  );
}

/** Site wordmark (Badge mark + "Retrack This"). */
export function Logo({ href = "/" }: { href?: string }) {
  return <Wordmark href={href} />;
}
