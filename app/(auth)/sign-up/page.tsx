"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFooterLink, AuthLayout } from "@/components/AuthLayout";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
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
      router.push(searchParams.get("next") ?? "/dashboard");
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

  const signInHref = searchParams.get("next")
    ? `/sign-in?next=${encodeURIComponent(searchParams.get("next")!)}`
    : "/sign-in";

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Join as a creator, musician, or both"
      footer={
        <>
          Already have an account? <AuthFooterLink href={signInHref}>Sign in</AuthFooterLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Email" name="email" type="email" required autoComplete="email" />
        <Input
          label="Password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          hint="At least 6 characters"
        />
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating account…" : "Sign up"}
        </Button>
      </form>
    </AuthLayout>
  );
}
