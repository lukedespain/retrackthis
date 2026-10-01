"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFooterLink, AuthLayout } from "@/components/AuthLayout";
import { AuthDivider, GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { safeInternalPath } from "@/lib/safeRedirect";
import { supabaseClient } from "@/lib/supabaseClient";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { data, error: signUpError } = await supabaseClient.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      router.push(safeInternalPath(searchParams.get("next"), "/producers"));
    } else {
      setNeedsConfirmation(true);
      setSubmitting(false);
    }
  }

  if (needsConfirmation) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="We sent a confirmation link. Click it, then come back and sign in."
        footer={<AuthFooterLink href="/sign-in">Go to sign in</AuthFooterLink>}
      />
    );
  }

  const safeNext = safeInternalPath(searchParams.get("next"), "");
  const signInHref = safeNext
    ? `/sign-in?next=${encodeURIComponent(safeNext)}`
    : "/sign-in";

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Post jobs, send takes, or both."
      footer={
        <>
          Already have an account? <AuthFooterLink href={signInHref}>Sign in</AuthFooterLink>
        </>
      }
    >
      <GoogleAuthButton nextPath={searchParams.get("next")} label="Continue with Google" />
      <AuthDivider />
      <form onSubmit={handleSubmit} className="stack" style={{ gap: 14 }}>
        <Input
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@studio.com"
          defaultValue={searchParams.get("email") ?? ""}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
          aside={<span className="hint">6+ characters</span>}
        />
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
