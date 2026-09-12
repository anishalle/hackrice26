"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startPersona } from "@/lib/persona";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function PersonaDemo() {
  const router = useRouter();
  const attempted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    startPersona().catch(() => setError("We couldn't open the Persona demo. Try again or continue to the app."));
  }, []);

  function retry() {
    setError(null);
    startPersona().catch(() => setError("We couldn't open the Persona demo. Try again or continue to the app."));
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <main className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Persona demo</p>
        <h1 className="text-xl font-bold">{error ? "Unable to open Persona" : "Opening Persona…"}</h1>
        <p className="text-sm text-muted-foreground">You are signed in. This demo shows the Persona screens and returns you to the app without checking the result.</p>
        {error ? <><p role="alert" className="text-sm text-destructive">{error}</p><Button onClick={retry}>Try again</Button></> : <Loader2 className="size-6 animate-spin" aria-label="Opening Persona" />}
        <Button variant="outline" className="w-full" onClick={() => router.replace("/home")}>Continue to app</Button>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return <ProtectedRoute><PersonaDemo /></ProtectedRoute>;
}
