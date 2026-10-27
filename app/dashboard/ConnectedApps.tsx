"use client";

import { useEffect, useState } from "react";
import { PlugIcon } from "@/components/brand/BridgeMark";
import { Alert } from "@/components/ui/Alert";

type App = { id: string; clientName: string; createdAt: string; lastUsedAt: string };

function lastUsed(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Used today";
  if (days === 1) return "Used yesterday";
  if (days < 30) return `Used ${days} days ago`;
  return `Used ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/** DAW plugins signed in to this account, each with Disconnect. Always shown: with none
 *  connected it introduces Retrack This Bridge. */
export function ConnectedApps() {
  const [apps, setApps] = useState<App[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/connected-apps")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setApps(Array.isArray(body?.apps) ? body.apps : []))
      .catch(() => setApps([]));
  }, []);

  async function disconnect(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/settings/connected-apps", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setApps((list) => (list ?? []).filter((app) => app.id !== id));
    } catch {
      setError("Couldn't disconnect. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (!apps) return null;
  return (
    <section className="card" id="connected-apps">
      <h2>Connected apps</h2>
      <p>
        {apps.length
          ? "DAW plugins signed in to your account. Disconnect one to sign it out."
          : "Post a part straight from your DAW, without leaving your session."}
      </p>
      {apps.length === 0 ? (
        <div className="bridge-promo">
          <span className="bridge-promo-ico">
            <PlugIcon size={20} />
          </span>
          <span className="t">
            <strong>Retrack This Bridge</strong>
            <span>Capture a track as it plays and post the job from your DAW. Logic Pro first.</span>
          </span>
          <span className="status draft">Coming soon</span>
        </div>
      ) : null}
      <div>
        {apps.map((app) => (
          <div key={app.id} className="opt-row">
            <div className="t">
              <strong>{app.clientName}</strong>
              <span>{lastUsed(app.lastUsedAt)}</span>
            </div>
            <button
              type="button"
              className="btn soft"
              style={{ height: 34, fontSize: 13.5, padding: "0 14px" }}
              disabled={busyId !== null}
              onClick={() => void disconnect(app.id)}
            >
              {busyId === app.id ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        ))}
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
    </section>
  );
}
