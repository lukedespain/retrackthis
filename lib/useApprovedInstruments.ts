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
  // Hold results until admin removals and renames are known, so a removed
  // instrument never flashes up (and can't be picked) while this loads.
  const [loaded, setLoaded] = useState(false);

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
      .catch(() => {})
      .finally(() => {
        if (!cancel) setLoaded(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const groups = useMemo(
    () => (loaded ? presentInstrumentGroups(extras, adjustments) : []),
    [loaded, extras, adjustments]
  );
  const catalog = useMemo(
    () => (loaded ? presentInstrumentCatalog(extras, adjustments) : []),
    [loaded, extras, adjustments]
  );

  return { extras, adjustments, groups, catalog, loaded };
}
