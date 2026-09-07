"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthFooterLink, AuthLayout } from "@/components/AuthLayout";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { supabaseClient } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabaseClient.auth.getSession();
      if (cancelled) return;
      setHasSession(Boolean(data.session));
      setReady(true);
    }

    void load();

    const { data: sub } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasSession(Boolean(session));
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("confirm"));

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabaseClient.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      window.setTimeout(() => {
        router.push("/producers");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <AuthLayout title="Choose a new password" subtitle="One moment…">
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      </AuthLayout>
    );
  }

  if (!hasSession) {
    return (
      <AuthLayout
        title="Link expired"
        subtitle="That reset link is invalid or already used. Request a new one and try again."
        footer={<AuthFooterLink href="/forgot-password">Request a new link</AuthFooterLink>}
      />
    );
  }

  if (done) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="You’re signed in. Taking you to your account…"
      />
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Pick something you’ll remember. You’ll be signed in after you save it."
      footer={<AuthFooterLink href="/sign-in">Back to sign in</AuthFooterLink>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="New password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          hint="At least 6 characters"
        />
        <Input
          label="Confirm password"
          name="confirm"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
