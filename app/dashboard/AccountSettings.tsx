"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
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
  const [passwordOpen, setPasswordOpen] = useState(false);

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

  async function saveName() {
    const res = await fetch("/api/settings/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error ?? "Could not save name");
    setName(body.name);
    onNameSaved?.(body.name);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNameSaved(false);
    setEmailMessage(null);
    const nextEmail = newEmail.trim().toLowerCase();
    const emailChanged = Boolean(nextEmail) && nextEmail !== email.toLowerCase();
    setSavingName(true);
    setSavingEmail(emailChanged);
    try {
      await saveName();
      if (emailChanged) {
        const { error: updateError } = await supabaseClient.auth.updateUser({ email: nextEmail });
        if (updateError) throw updateError;
        setEmailMessage("Check both your old and new inbox to confirm the email change.");
      }
      setNameSaved(true);
      window.setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSavingName(false);
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
    return <p className="text-sm text-gray-500">Loading account…</p>;
  }

  const busy = savingName || savingEmail;

  return (
    <div className="stack">
      <form onSubmit={saveProfile} className="stack">
        <div className="grid2">
          <Input
            label="Display name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            disabled={busy}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={busy}
          />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="submit" className="btn primary" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            className="btn soft"
            onClick={() => setPasswordOpen((open) => !open)}
          >
            Change password
          </button>
          {nameSaved && !emailMessage ? <p className="text-sm text-emerald-700">Saved</p> : null}
          {emailMessage ? <p className="text-sm text-emerald-700">{emailMessage}</p> : null}
        </div>
      </form>

      {passwordOpen ? (
        <form onSubmit={savePassword} className="stack" id="password">
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
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="submit" className="btn primary" disabled={savingPassword}>
              {savingPassword ? "Updating…" : "Update password"}
            </button>
            {passwordSaved ? <p className="text-sm text-emerald-700">Password updated</p> : null}
          </div>
        </form>
      ) : null}

      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
