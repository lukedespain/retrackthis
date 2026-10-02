"use client";

import { useEffect, useMemo, useState } from "react";
import {
  presentInstrumentCatalog,
  presentInstrumentGroups,
  type ApprovedInstrumentLite,
  type InstrumentAdjustments,
} from "@/lib/instruments";

const EMPTY: InstrumentAdjustments = { labels: {}, hidden: [] };

export function useInstrumentCatalog() {
  const [extras, setExtras] = useState<ApprovedInstrumentLite[]>([]);
  const [adjustments, setAdjustments] = useState<InstrumentAdjustments>(EMPTY);

  useEffect(() => {
    let cancel = false;
    fetch("/api/instruments/approved")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancel || !body) return;
        if (Array.isArray(body.instruments)) {
          setExtras(
            body.instruments.filter(
              (item: ApprovedInstrumentLite) =>
                item && typeof item.id === "string" && typeof item.label === "string" && typeof item.groupId === "string"
            )
          );
        }
        const labels =
          body.labels && typeof body.labels === "object" ? (body.labels as Record<string, string>) : {};
        const hidden = Array.isArray(body.hidden) ? body.hidden.filter((id: unknown) => typeof id === "string") : [];
        setAdjustments({ labels, hidden });
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  const groups = useMemo(() => presentInstrumentGroups(extras, adjustments), [extras, adjustments]);
  const catalog = useMemo(() => presentInstrumentCatalog(extras, adjustments), [extras, adjustments]);

  return { extras, adjustments, groups, catalog };
}
