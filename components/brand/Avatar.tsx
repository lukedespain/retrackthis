"use client";

import { useId, useMemo } from "react";
import { avatarSvg, cleanAvatar, initialsFor } from "@/lib/avatar";

type Props = {
  avatar: unknown | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Render only the SVG, for use inside an element that already has `avatar art`. */
  bare?: boolean;
};

export function Avatar({ avatar, name, size = "md", className, bare = false }: Props) {
  const uid = useId();
  const html = useMemo(() => {
    const a = cleanAvatar(avatar);
    return a ? avatarSvg(a, uid) : null;
  }, [avatar, uid]);
  if (!html) {
    const ini = initialsFor(name);
    if (bare) return <span className={`ini${className ? ` ${className}` : ""}`}>{ini}</span>;
    return (
      <span className={["avatar", "art", size !== "md" && size, className].filter(Boolean).join(" ")} role="img" aria-label={name}>
        <span className="ini">{ini}</span>
      </span>
    );
  }
  if (bare) {
    return <span className={className} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  const cls = ["avatar", "art", size !== "md" && size, className].filter(Boolean).join(" ");
  return <span className={cls} role="img" aria-label={name} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default Avatar;
