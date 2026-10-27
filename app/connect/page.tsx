"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { supabaseClient } from "@/lib/supabaseClient";

type Lookup =
  | { status: "pending" | "approved" | "denied"; clientName: string; userCode: string }
  | { status: "invalid" | "expired" };

export default function ConnectPage() {
  return (
    <Suspense fallback={null}>
      <Connect />
    </Suspense>
  );
}

/**
 * Approve a DAW plugin sign-in. The plugin shows a code (e.g. RTKX-7Q2M) and opens
 * /connect?code=…; approving links that plugin to the signed-in account.
 */
function Connect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"approved" | "denied" | null>(null);
  // Show nothing until we know they're signed in, so a signed-out visit doesn't
  // flash the form before going to sign-in.
  const [ready, setReady] = useState(false);

  async function check(value: string) {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`/api/plugin/auth/lookup?code=${encodeURIComponent(value)}`);
      if (res.status === 401) {
        router.replace(`/sign-in?next=${encodeURIComponent(`/connect?code=${value}`)}`);
        return;
      }
      setLookup(await res.json());
    } catch {
      setError("Couldn't check that code. Try again.");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const initial = searchParams.get("code") ?? "";
      if (!data.session) {
        router.replace(`/sign-in?next=${encodeURIComponent(initial ? `/connect?code=${initial}` : "/connect")}`);
        return;
      }
      setReady(true);
      if (initial) void check(initial);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function decide(approve: boolean) {
    if (!lookup || !("userCode" in lookup)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plugin/auth/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: lookup.userCode, approve }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Something went wrong.");
      setDone(approve ? "approved" : "denied");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (done === "approved") {
    return (
      <AuthLayout title="You're connected" subtitle="Head back to your DAW. The Retrack plugin is signed in to your account.">
        <p className="hint">You can disconnect it anytime in Settings under Connected apps.</p>
      </AuthLayout>
    );
  }
  if (done === "denied") {
    return (
      <AuthLayout title="Request denied" subtitle="Nothing was connected. If that was you, start again in your DAW." />
    );
  }

  const pending = lookup && lookup.status === "pending" ? lookup : null;
  return (
    <AuthLayout
      title="Connect your DAW"
      subtitle={pending ? undefined : "Enter the code shown in the Retrack plugin."}
    >
      {pending ? (
        <div className="stack" style={{ gap: 14 }}>
          <p>
            Connect <b>{pending.clientName}</b> to your account?
          </p>
          <div className="connect-code">{pending.userCode}</div>
          <p className="hint">
            Only approve if you just started this in your DAW and this code matches. Never approve a code someone sent
            you.
          </p>
          {error ? <Alert variant="error">{error}</Alert> : null}
          <Button type="button" disabled={busy} onClick={() => void decide(true)}>
            {busy ? "Connecting…" : "Approve"}
          </Button>
          <button type="button" className="btn text" disabled={busy} onClick={() => void decide(false)}>
            Deny
          </button>
        </div>
      ) : (
        <form
          className="stack"
          style={{ gap: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            void check(code);
          }}
        >
          <input
            className="in connect-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABCD-EFGH"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label="Code from your DAW"
          />
          {lookup?.status === "expired" ? (
            <Alert variant="error">That code expired. Start again in your DAW for a new one.</Alert>
          ) : lookup?.status === "invalid" || lookup?.status === "approved" || lookup?.status === "denied" ? (
            <Alert variant="error">That code isn't valid. Check it against your DAW, or start again there.</Alert>
          ) : null}
          {error ? <Alert variant="error">{error}</Alert> : null}
          <Button type="submit" disabled={checking || !code.trim()}>
            {checking ? "Checking…" : "Continue"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
