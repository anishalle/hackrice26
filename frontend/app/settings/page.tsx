"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { startPersona } from "@/lib/persona";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

function PersonaSettings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // AuthProvider fetches the account again on the full-page callback navigation.
  // The callback query parameter is feedback only, never proof of verification.
  const developmentBypass = process.env.NODE_ENV === "development";
  const verified = developmentBypass || user?.prefs.persona_verified === true;
  const callbackError = params.get("persona") === "error"
    ? "Identity verification was not completed. Please try again."
    : params.get("persona") === "success" && !verified
      ? "We could not confirm your verification. Please try again."
      : null;

  async function beginVerification() {
    setBusy(true);
    setError(null);
    try {
      await startPersona();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start verification. Please try again.");
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await logout();
      router.replace("/login");
    } catch {
      setError("Unable to sign out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <main className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <ShieldCheck className="size-8 text-primary" aria-hidden="true" />
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{developmentBypass ? "Local development · Persona bypassed" : verified ? "Account verified" : "One more step"}</p>
          <h1 className="text-xl font-bold">{verified ? "You're ready to go" : "Verify your identity"}</h1>
          <p className="text-sm text-muted-foreground">
            {verified
              ? developmentBypass ? "Persona is disabled for local development. Continue to the app." : "Your identity verification is complete. Continue to the app."
              : "You're signed in. Continue to Persona to verify your identity before entering the app."}
          </p>
        </div>
        {(error || callbackError) && <p role="alert" className="text-sm text-destructive">{error || callbackError}</p>}
        <div className="space-y-3">
          <Button className="w-full" disabled={busy} onClick={verified ? () => router.replace("/home") : beginVerification}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {verified ? "Continue to app" : busy ? "Opening Persona…" : "Continue with Persona"}
          </Button>
          <Button variant="outline" className="w-full" disabled={busy} onClick={signOut}>Sign out</Button>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute requirePersona={false}>
      <Suspense fallback={<p className="p-6" role="status">Loading verification…</p>}>
        <PersonaSettings />
      </Suspense>
    </ProtectedRoute>
  );
}
