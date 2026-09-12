"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, requirePersona = true }: { children: React.ReactNode; requirePersona?: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const needsPersona = requirePersona && process.env.NODE_ENV !== "development";

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (!loading && user && needsPersona && user.prefs.persona_verified !== true) {
      router.replace("/settings");
    }
  }, [user, loading, router, needsPersona]);

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  if (!user || (needsPersona && user.prefs.persona_verified !== true)) {
    return null;
  }

  return <>{children}</>;
}
