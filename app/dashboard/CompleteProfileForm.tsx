"use client";

import { useEffect, useState } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { InstrumentMultiSelect } from "@/components/InstrumentMultiSelect";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabaseClient } from "@/lib/supabaseClient";

export function CompleteProfileForm({ onDone }: { onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [defaultName, setDefaultName] = useState("");

  useEffect(() => {
    let cancelled = false;
    supabaseClient.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const meta = data.user?.user_metadata ?? {};
      const fromGoogle =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        "";
      setDefaultName(fromGoogle.trim());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          instruments,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="One more thing"
      subtitle="What should we call you, and what do you play?"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Name"
          name="name"
          required
          autoFocus={!defaultName}
          defaultValue={defaultName}
          key={defaultName || "empty"}
          placeholder="Alex Rivera"
        />

        <InstrumentMultiSelect
          label="I play…"
          hint="Expand a category and check each part you can record live."
          selectedIds={instruments}
          onChange={setInstruments}
          disabled={submitting}
        />

        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </form>
    </AuthLayout>
  );
}
