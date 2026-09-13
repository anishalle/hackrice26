"use client";

import { useRouter } from "next/navigation";
import { PersonaVerification } from "@/components/persona-verification";
import { ProtectedRoute } from "@/components/protected-route";

export default function SettingsPage() {
  const router = useRouter();
  return (
    <ProtectedRoute>
      <PersonaVerification onBack={() => router.replace("/home")} />
    </ProtectedRoute>
  );
}
