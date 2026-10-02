"use client";

import { useEffect, useState } from "react";
import type { ApprovedInstrumentLite } from "@/lib/instruments";

export function useApprovedInstruments() {
  const [extras, setExtras] = useState<ApprovedInstrumentLite[]>([]);

  useEffect(() => {
    let cancel = false;
    fetch("/api/instruments/approved")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancel || !Array.isArray(body?.instruments)) return;
        setExtras(
          body.instruments.filter(
            (item: ApprovedInstrumentLite) =>
              item && typeof item.id === "string" && typeof item.label === "string" && typeof item.groupId === "string"
          )
        );
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  return extras;
}
