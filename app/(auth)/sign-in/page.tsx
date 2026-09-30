"use client";

import Link from "next/link";
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

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Welcome back" subtitle="Sign in to your account.">
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        </AuthLayout>
      }
    >
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    router.push(safeInternalPath(searchParams.get("next"), "/producers"));
    router.refresh();
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account."
      footer={
        <>
          New here? <AuthFooterLink href="/sign-up">Create an account</AuthFooterLink>
        </>
      }
    >
      <GoogleAuthButton nextPath={searchParams.get("next")} />
      <AuthDivider />
      <form onSubmit={handleSubmit} className="stack" style={{ gap: 14 }}>
        <Input label="Email" name="email" type="email" required autoComplete="email" placeholder="you@studio.com" />
        <Input
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          aside={
            <Link className="hint" href="/forgot-password">
              Forgot?
            </Link>
          }
        />
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
