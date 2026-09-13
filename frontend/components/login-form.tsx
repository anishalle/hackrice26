"use client";

import { useState } from "react";
import { cn } from "cn";
import { useAuth } from "@/lib/auth-context";
import { APPWRITE_PROJECT_NAME } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Mail, ArrowRight, Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export function LoginForm({
  className,
  returnPath,
  ...props
}: React.ComponentProps<"div"> & { returnPath?: string }) {
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setSubmitting(true);

    try {
      await sendMagicLink(email.trim(), undefined, returnPath);
      setIsSent(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to send magic link. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-7 text-green-600" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a magic login link to{" "}
              <span className="font-semibold text-foreground">{email}</span>
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Mail className="size-4 shrink-0 mt-0.5 text-primary" />
            <span>
              Click the link in the email to automatically sign in. The link will expire in 1 hour.
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsSent(false);
              setError(null);
            }}
          >
            Use a different email
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              setError(null);
              setSubmitting(true);
              try {
                await sendMagicLink(email.trim(), undefined, returnPath);
              } catch (err: unknown) {
                const msg =
                  err instanceof Error ? err.message : "Failed to resend magic link.";
                setError(msg);
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Resending...
              </>
            ) : (
              "Resend magic link"
            )}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome to {APPWRITE_PROJECT_NAME}
            </h1>
            <FieldDescription>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="underline underline-offset-4 text-foreground font-medium">
                Sign up
              </Link>
            </FieldDescription>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              autoFocus
              required
            />
          </Field>

          <Field>
            <Button type="submit" className="w-full" disabled={submitting || !email.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending magic link...
                </>
              ) : (
                <>
                  Send Magic Link
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center text-xs">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </FieldDescription>
    </div>
  );
}
