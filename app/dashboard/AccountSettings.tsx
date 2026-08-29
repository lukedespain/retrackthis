"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabaseClient } from "@/lib/supabaseClient";

export function AccountSettings({ onNameSaved }: { onNameSaved?: (name: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetch("/api/settings/account")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Could not load account");
        setName(body.name ?? "");
        setEmail(body.email ?? "");
        setNewEmail(body.email ?? "");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load account");
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setError(null);
    setNameSaved(false);
    try {
      const res = await fetch("/api/settings/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save name");
      setName(body.name);
      onNameSaved?.(body.name);
      setNameSaved(true);
      window.setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save name");
    } finally {
      setSavingName(false);
    }
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    const next = newEmail.trim().toLowerCase();
    if (!next || next === email.toLowerCase()) return;

    setSavingEmail(true);
    setError(null);
    setEmailMessage(null);
    try {
      const { error: updateError } = await supabaseClient.auth.updateUser({ email: next });
      if (updateError) throw updateError;
      setEmailMessage("Check both your old and new inbox to confirm the email change.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update email");
    } finally {
      setSavingEmail(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPasswordSaved(false);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) throw new Error("Current password is incorrect.");

      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      window.setTimeout(() => setPasswordSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <Card padding="md" id="account">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading account…</p>
      </Card>
    );
  }

  return (
    <div id="account" className="space-y-5">
      <Card padding="md">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Display name</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          How you appear on jobs and submissions.
        </p>
        <form onSubmit={saveName} className="mt-5 space-y-4">
          <Input
            label="Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            disabled={savingName}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={savingName || !name.trim()}>
              {savingName ? "Saving…" : "Save name"}
            </Button>
            {nameSaved && <p className="text-sm text-emerald-700 dark:text-emerald-400">Saved</p>}
          </div>
        </form>
      </Card>

      <Card padding="md">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Email</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Used for sign-in and notifications. Changing it may require confirmation.
        </p>
        <form onSubmit={saveEmail} className="mt-5 space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={savingEmail}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={savingEmail || newEmail.trim().toLowerCase() === email.toLowerCase()}
            >
              {savingEmail ? "Updating…" : "Update email"}
            </Button>
            {emailMessage && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{emailMessage}</p>
            )}
          </div>
        </form>
      </Card>

      <Card padding="md">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Password</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter your current password, then choose a new one.
        </p>
        <form onSubmit={savePassword} className="mt-5 space-y-4">
          <Input
            label="Current password"
            name="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={savingPassword}
          />
          <Input
            label="New password"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            hint="At least 6 characters"
            disabled={savingPassword}
          />
          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            disabled={savingPassword}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? "Updating…" : "Update password"}
            </Button>
            {passwordSaved && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">Password updated</p>
            )}
          </div>
        </form>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
