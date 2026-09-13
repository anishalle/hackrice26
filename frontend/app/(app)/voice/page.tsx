"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { VoicePreservation } from "@/components/voice-preservation";

export default function VoicePage() {
  const { user, loading } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-medium">Your voice bank</h1>
      <p className="mt-2 mb-6 text-[var(--text-2)]">
        Record your weekly exercises, listen back, and preserve your voice.
      </p>
      {loading ? <p role="status">Loading your account…</p> : user ? (
        <VoicePreservation key={user.$id} ownerSubject={user.$id} displayName={user.name || "My preserved voice"} />
      ) : (
        <p><Link className="underline" href="/login">Sign in</Link> to access your saved recordings and voice clone.</p>
      )}
    </div>
  );
}
