"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabaseClient } from "@/lib/supabaseClient";

export default function SignUpPage() {
  const router = useRouter();
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
      router.push("/dashboard");
    } else {
      // Email confirmation is required before a session exists.
      setNeedsConfirmation(true);
      setSubmitting(false);
    }
  }

  if (needsConfirmation) {
    return (
      <main className="mx-auto max-w-sm px-6 py-24 text-center">
        <h1 className="text-xl font-medium text-gray-900">Check your email</h1>
        <p className="mt-2 text-sm text-gray-500">
          We sent a confirmation link — click it, then come back and sign in.
        </p>
        <Link href="/sign-in" className="mt-6 inline-block text-sm text-accent">
          Go to sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-xl font-medium text-gray-900">Create an account</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            name="email"
            type="email"
            required
            className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating account…" : "Sign up"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-accent">
          Sign in
        </Link>
      </p>
    </main>
  );
}
