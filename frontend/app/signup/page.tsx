"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignupForm } from "@/components/signup-form";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <SignupForm />
      </div>
    </div>
  );
}
