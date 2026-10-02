"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";

type Prefs = {
  notifyJobAlerts: boolean;
  notifyTakeSubmitted: boolean;
  notifyTakeOutcome: boolean;
};

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Could not load settings");
        setPrefs({
          notifyJobAlerts: Boolean(body.notifyJobAlerts),
          notifyTakeSubmitted: Boolean(body.notifyTakeSubmitted),
          notifyTakeOutcome: Boolean(body.notifyTakeOutcome),
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load settings");
      });
  }, []);

  async function save(next: Prefs) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save settings");
      setPrefs({
        notifyJobAlerts: Boolean(body.notifyJobAlerts),
        notifyTakeSubmitted: Boolean(body.notifyTakeSubmitted),
        notifyTakeOutcome: Boolean(body.notifyTakeOutcome),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!prefs && !error) {
    return <p className="text-sm text-gray-500">Loading email settings…</p>;
  }

  if (!prefs) {
    return <Alert variant="error">{error}</Alert>;
  }

  return (
    <div>
      <div>
          <PrefRow
            title="New job alerts"
            description="When a gig opens for an instrument you play"
            checked={prefs.notifyJobAlerts}
            disabled={saving}
            onChange={(checked) => void save({ ...prefs, notifyJobAlerts: checked })}
          />
          <PrefRow
            title="New submissions on my jobs"
            description="When a musician submits to your job"
            checked={prefs.notifyTakeSubmitted}
            disabled={saving}
            onChange={(checked) => void save({ ...prefs, notifyTakeSubmitted: checked })}
          />
          <PrefRow
            title="Take outcomes"
            description="When a producer picks your take"
            checked={prefs.notifyTakeOutcome}
            disabled={saving}
            onChange={(checked) => void save({ ...prefs, notifyTakeOutcome: checked })}
          />
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {saved && <p className="text-sm text-emerald-700">Saved</p>}
    </div>
  );
}

function PrefRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="opt-row">
      <div className="t">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <button
        type="button"
        className="switch"
        aria-pressed={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

