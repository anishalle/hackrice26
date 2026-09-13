"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

function VerifyContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");
  const fn = searchParams.get("fn");
  const ln = searchParams.get("ln");
  const ph = searchParams.get("ph");
  const router = useRouter();
  const { verifyMagicLink } = useAuth();

  const isMissingParams = !userId || !secret;

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    isMissingParams ? "error" : "verifying"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    isMissingParams ? "Invalid verification link. Missing user ID or secret." : null
  );
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (isMissingParams || attemptedRef.current) return;
    attemptedRef.current = true;

    const performVerification = async () => {
      try {
        await verifyMagicLink(userId, secret, {
          firstName: fn || undefined,
          lastName: ln || undefined,
          phone: ph || undefined,
        });
        setStatus("success");
        setTimeout(() => {
          router.replace("/settings");
        }, 1200);
      } catch (err: unknown) {
        setStatus("error");
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to authenticate with this magic link. It may have expired or already been used.";
        setErrorMessage(msg);
      }
    };

    performVerification();
  }, [isMissingParams, userId, secret, fn, ln, ph, verifyMagicLink, router]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xs">
        {status === "verifying" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="size-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Verifying magic link</h2>
              <p className="text-sm text-muted-foreground">
                Authenticating your session, please wait...
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-500/10 text-green-600">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">Signed in!</h2>
              <p className="text-sm text-muted-foreground">
                Opening your accessibility settings...
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Verification failed</h2>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Link href="/login" className="w-full mt-2">
              <Button className="w-full">Back to Login</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
