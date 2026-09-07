"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthFooterLink, AuthLayout } from "@/components/AuthLayout";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { supabaseClient } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Reset your password" subtitle="We’ll email you a link.">
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        </AuthLayout>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error") === "invalid_link";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    linkError ? "That reset link is invalid or expired. Request a new one below." : null
  );
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim().toLowerCase();

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      "/reset-password"
    )}`;

    const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="If an account exists for that address, we sent a link to choose a new password. The link expires after a short time."
        footer={<AuthFooterLink href="/sign-in">Back to sign in</AuthFooterLink>}
      />
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email on your account. We’ll send a link so you can choose a new password."
      footer={
        <>
          Remembered it? <AuthFooterLink href="/sign-in">Sign in</AuthFooterLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Email" name="email" type="email" required autoComplete="email" />
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Sending…" : "Email me a reset link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
