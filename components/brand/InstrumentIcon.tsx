"use client";

import { useId } from "react";
import { instrumentIconSvg } from "@/lib/instrumentIcons";

export function InstrumentIcon({ instrument, className }: { instrument: string; className?: string }) {
  const uid = useId();
  return (
    <span
      className={className ? `ii ${className}` : "ii"}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: instrumentIconSvg(instrument, uid) }}
    />
  );
}
