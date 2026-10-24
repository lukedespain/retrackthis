"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { PrefRow } from "@/app/dashboard/NotificationSettings";

/** "Show me on the homepage": the community strip under the mission line. */
export function CommunityVisibilitySetting() {
  const [show, setShow] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/community")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setShow(typeof body?.showInCommunity === "boolean" ? body.showInCommunity : null))
      .catch(() => {});
  }, []);

  async function save(next: boolean) {
    setSaving(true);
    setError(null);
    setShow(next);
    try {
      const res = await fetch("/api/settings/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showInCommunity: next }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save");
      setShow(Boolean(body.showInCommunity));
    } catch (err) {
      setShow(!next);
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (show === null) return null;
  return (
    <div style={{ marginTop: 18 }}>
      <PrefRow
        title="Show me on the homepage"
        description="Your first name, last initial, avatar, and instruments, in the community on retrackthis.com"
        checked={show}
        disabled={saving}
        onChange={(checked) => void save(checked)}
      />
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
