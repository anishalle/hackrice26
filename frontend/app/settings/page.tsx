"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PersonaVerification } from "@/components/persona-verification";
import { ProtectedRoute } from "@/components/protected-route";
import { safeReturnPath } from "@/lib/auth-redirect";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = safeReturnPath(searchParams.get("next"));

  return (
    <PersonaVerification
      onBack={() => router.replace(returnPath)}
      onSkip={() => router.replace(returnPath)}
      returnPath={returnPath}
    />
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<main className="paper min-h-dvh" />}>
        <SettingsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
