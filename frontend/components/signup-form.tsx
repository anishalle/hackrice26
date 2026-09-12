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
import { ArrowRight, Loader2, Sparkles, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import Link from "next/link";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { sendMagicLink } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !firstName.trim() || !lastName.trim()) return;

    setError(null);
    setSubmitting(true);

    try {
      await sendMagicLink(email.trim(), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      setIsSent(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create account. Please try again.";
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
              We sent a verification link to{" "}
              <span className="font-semibold text-foreground">{email}</span>
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
          <p className="flex items-start gap-2">
            <Mail className="size-4 shrink-0 mt-0.5 text-primary" />
            <span>
              Click the magic link in your email to activate your account for{" "}
              <strong className="text-foreground">{firstName} {lastName}</strong>.
            </span>
          </p>
          {phone && (
            <p className="text-xs text-muted-foreground pl-6">
              Phone: {phone}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsSent(false);
              setError(null);
            }}
          >
            Edit information
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              setError(null);
              setSubmitting(true);
              try {
                await sendMagicLink(email.trim(), {
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                  phone: phone.trim() || undefined,
                });
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
              Create an account with {APPWRITE_PROJECT_NAME}
            </h1>
            <FieldDescription>
              Already have an account?{" "}
              <Link href="/login" className="underline underline-offset-4 text-foreground font-medium">
                Sign in
              </Link>
            </FieldDescription>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* First Name & Last Name (above email) */}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="firstName">First name</FieldLabel>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={submitting}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lastName">Last name</FieldLabel>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={submitting}
              />
            </Field>
          </div>

          {/* Email */}
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />
          </Field>

          {/* Phone number (below email, optional) */}
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="phone">Phone number</FieldLabel>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
            />
          </Field>

          {/* Submit button (OAuth disabled) */}
          <Field>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !email.trim() || !firstName.trim() || !lastName.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center text-xs">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
