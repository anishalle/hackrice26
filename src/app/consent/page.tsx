"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { AXIS_SPECS } from "@/lib/capability";
import { EXCLUDED, PROVIDER, SCOPES, axesCorroborated } from "@/lib/meridian";
import { useSession } from "@/lib/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { Annotation, Button, Panel, PlotLabel, Rule, SimulatedBadge } from "@/components/ui";
import { IconArrowLeft, IconArrowRight, IconBlocked, IconCheck, IconLock } from "@/components/icons";

/**
 * Provider authorization.
 *
 * Modelled as an OAuth-style consent handoff, but the consent screen is the
 * product surface rather than the speed bump: each scope names the FHIR-shaped
 * resource it reads, what that means in plain language, why this app wants it,
 * and which axis it corroborates. Optional scopes are genuinely optional and
 * the app states what it will never ask for.
 *
 * Meridian Health is fictional and every value here is fixture data.
 */
export default function ConsentPage() {
  const { setAttestation, adaptation } = useSession();
  const router = useRouter();
  const reduce = useReducedMotion();
  const animate = !reduce && !adaptation.reduceMotion;

  const [granted, setGranted] = useState<string[]>(SCOPES.map((s) => s.id));
  const [submitting, setSubmitting] = useState(false);

  function toggle(id: string, required: boolean) {
    if (required) return;
    setGranted((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  }

  function authorize() {
    setSubmitting(true);
    window.setTimeout(() => {
      setAttestation({
        provider: PROVIDER.name,
        attestedAt: new Date().toISOString(),
        axes: axesCorroborated(granted),
      });
      router.push("/feed");
    }, 900);
  }

  function skip() {
    setAttestation(null);
    router.push("/feed");
  }

  const corroborated = axesCorroborated(granted);

  return (
    <main className="min-h-dvh bg-[var(--bg)]">
      <div className="mx-auto max-w-[52rem] py-6 px-[var(--pad-x)]">
        <header className="flex items-center justify-between">
          <Link
            href="/verify"
            className="target -ml-3 inline-flex items-center gap-2 px-3 font-mono text-[0.8125rem] tracking-[0.18em] uppercase text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
          >
            <IconArrowLeft width={16} height={16} />
            Verification
          </Link>
          <ThemeToggle />
        </header>

        <div className="mt-14">
          <PlotLabel>Step 3 of 3</PlotLabel>
          <h1 className="mt-3 max-w-[32rem] display-sm text-[clamp(2rem,4.5vw,3rem)]">
            {PROVIDER.name} is about to share five things.
          </h1>
          <p className="prose-lg mt-5 text-[var(--text-2)]">
            Each one is listed with the exact record it reads. Turn off anything
            you&rsquo;d rather keep &mdash; only the first is required, and the
            app works without the rest.
          </p>
        </div>

        <Panel className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-7">
            <div className="flex items-center gap-2.5">
              <IconLock width={16} height={16} className="text-[var(--accent)]" />
              <p className="font-mono text-[0.8125rem] tracking-[0.06em]">{PROVIDER.name}</p>
            </div>
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--text-2)]">
              Authorizing &rarr; Axis
            </p>
          </div>
          <Rule major />

          <ul>
            {SCOPES.map((scope, i) => {
              const on = granted.includes(scope.id);
              return (
                <li key={scope.id}>
                  {i > 0 && <Rule />}
                  <label
                    className={`flex cursor-pointer items-start gap-4 px-6 py-5 transition-colors sm:px-7 ${
                      scope.required ? "cursor-default" : "hover:bg-[color-mix(in_oklab,var(--text)_3%,transparent)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={scope.required}
                      onChange={() => toggle(scope.id, scope.required)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand)] disabled:opacity-50"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className={`text-[0.9375rem] font-medium ${on ? "" : "text-[var(--text-2)]"}`}>
                          {scope.label}
                        </span>
                        {scope.required && (
                          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--text-2)]">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 font-mono text-[0.75rem] text-[var(--text-2)]">{scope.resource}</p>
                      <p className="mt-2 text-[0.875rem] leading-[1.55] text-[var(--text-2)]">{scope.reason}</p>
                      {scope.corroborates.length > 0 && on && (
                        <Annotation tone="attest" className="mt-2">
                          corroborates{" "}
                          {scope.corroborates.map((a) => AXIS_SPECS[a].title.toLowerCase()).join(", ")}
                        </Annotation>
                      )}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>

          <Rule major />
          <div className="px-6 py-5 sm:px-7">
            <PlotLabel>Never requested</PlotLabel>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {EXCLUDED.map((x) => (
                <li key={x} className="flex items-center gap-1.5 font-mono text-[0.75rem] text-[var(--text-2)]">
                  <IconBlocked width={13} height={13} className="opacity-60" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <motion.div layout={animate} className="mt-7 flex flex-wrap items-center gap-4">
          <Button onClick={authorize} disabled={submitting} className="h-12">
            {submitting ? "Authorizing…" : `Authorize ${granted.length} of ${SCOPES.length}`}
            {!submitting && <IconArrowRight width={18} height={18} />}
          </Button>
          <Button variant="quiet" onClick={skip} disabled={submitting} className="h-12">
            Continue without attestation
          </Button>
        </motion.div>

        {corroborated.length > 0 && (
          <div className="mt-6 flex gap-2.5">
            <IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <p className="max-w-[36rem] text-[0.875rem] leading-[1.55] text-[var(--text-2)]">
              This will mark{" "}
              <span className="text-[var(--accent)]">
                {corroborated.map((a) => AXIS_SPECS[a].title.toLowerCase()).join(", ")}
              </span>{" "}
              as provider-attested on your profile, so you won&rsquo;t be asked to demonstrate them again.
            </p>
          </div>
        )}

        <div className="mt-8">
          <Rule />
          <div className="mt-5">
            <SimulatedBadge>{PROVIDER.disclaimer}</SimulatedBadge>
          </div>
        </div>

        <div className="h-16" />
      </div>
    </main>
  );
}
