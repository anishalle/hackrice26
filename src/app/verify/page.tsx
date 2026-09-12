"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { AXIS_SPECS } from "@/lib/capability";
import { routeVerification, recommended, type ModalityVerdict } from "@/lib/verification";
import { useSession } from "@/lib/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { Annotation, Button, Panel, PlotLabel, Rule, SimulatedBadge } from "@/components/ui";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBlocked,
  IconCheck,
  IconLock,
  IconShield,
} from "@/components/icons";

/**
 * Adaptive verification.
 *
 * The screen's job is not to hide the unavailable options — it is to show them,
 * struck through, each naming the exact demand it makes that this person's
 * profile says they cannot meet. Routing you around a barrier silently is a
 * worse experience than routing you around it legibly.
 */
export default function VerifyPage() {
  const { profile, setVerifiedWith, adaptation, hydrated } = useSession();
  const router = useRouter();
  const reduce = useReducedMotion();
  const animate = !reduce && !adaptation.reduceMotion;
  const [running, setRunning] = useState<string | null>(null);

  const verdicts = routeVerification(profile);
  const pick = recommended(verdicts);
  const available = verdicts.filter((v) => v.available);
  const unavailable = verdicts.filter((v) => !v.available);

  function run(v: ModalityVerdict) {
    setRunning(v.modality.id);
    // Simulated: a real integration would hand off to the provider's SDK here.
    window.setTimeout(() => {
      setVerifiedWith(v.modality.id);
      router.push(v.modality.id === "provider-attestation" ? "/consent" : "/consent");
    }, 900);
  }

  return (
    <main className="min-h-dvh bg-[var(--bg)]">
      <div className="mx-auto max-w-[54rem] py-6 px-[var(--pad-x)]">
        <header className="flex items-center justify-between">
          <Link
            href="/profile"
            className="target -ml-3 inline-flex items-center gap-2 px-3 font-mono text-[0.8125rem] tracking-[0.18em] uppercase text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
          >
            <IconArrowLeft width={16} height={16} />
            Profile
          </Link>
          <ThemeToggle />
        </header>

        <div className="mt-14 max-w-[36rem]">
          <PlotLabel>Step 2 of 3</PlotLabel>
          <h1 className="mt-3 display-sm text-[clamp(2rem,4.5vw,3rem)]">
            Prove it&rsquo;s you, a way you can finish.
          </h1>
          <p className="prose-lg mt-5 text-[var(--text-2)]">
            Five standard checks were evaluated against your profile.{" "}
            {hydrated && unavailable.length > 0 ? (
              <>
                <span className="font-mono tabular-nums text-[var(--brand)]">{unavailable.length}</span>{" "}
                make a demand you told us you can&rsquo;t meet, so they&rsquo;re off the table — and
                here&rsquo;s exactly which demand.
              </>
            ) : (
              <>All five are available to you.</>
            )}
          </p>
        </div>

        <section className="mt-12">
          <PlotLabel>Available to you</PlotLabel>
          <Rule className="mt-3" major />
          <ul className="mt-5 grid gap-3">
            {available.map((v, i) => (
              <motion.li
                key={v.modality.id}
                initial={animate ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: animate ? i * 0.05 : 0, ease: [0.16, 1, 0.3, 1] }}
              >
                <Panel as="article" className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <IconCheck width={17} height={17} className="shrink-0 text-[var(--accent)]" />
                        <h2 className="text-[1.0625rem] font-medium">{v.modality.name}</h2>
                        {pick?.modality.id === v.modality.id && (
                          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--accent)]">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[0.9375rem] leading-[1.55] text-[var(--text-2)]">
                        {v.modality.action}
                      </p>
                      <p className="mt-2.5 font-mono text-[0.75rem] text-[var(--text-2)]">
                        ~{v.modality.duration}s &middot; {v.modality.assurance} assurance
                      </p>
                    </div>
                    <Button
                      onClick={() => run(v)}
                      disabled={running !== null}
                      variant={pick?.modality.id === v.modality.id ? "primary" : "secondary"}
                      className="h-11 shrink-0"
                    >
                      {running === v.modality.id ? "Verifying…" : "Use this"}
                      {running !== v.modality.id && <IconArrowRight width={17} height={17} />}
                    </Button>
                  </div>
                </Panel>
              </motion.li>
            ))}
          </ul>
        </section>

        {unavailable.length > 0 && (
          <section className="mt-12">
            <PlotLabel>Ruled out by your profile</PlotLabel>
            <Rule className="mt-3" />
            <ul className="mt-5 grid gap-4">
              {unavailable.map((v) => (
                <li key={v.modality.id} className="flex gap-3">
                  <IconBlocked
                    width={17}
                    height={17}
                    className="mt-0.5 shrink-0 text-[var(--text-2)] opacity-60"
                  />
                  <div className="min-w-0">
                    <h3 className="text-[0.9375rem] text-[var(--text-2)] line-through decoration-[var(--text-2)]/50">
                      {v.modality.name}
                    </h3>
                    {v.blockers.map((b) => (
                      <Annotation key={b.axis} className="mt-1.5">
                        requires {b.demand} &mdash; {AXIS_SPECS[b.axis].title.toLowerCase()} axis
                      </Annotation>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-12">
          <Rule />
          <div className="mt-5 flex gap-3">
            <IconShield width={18} height={18} className="mt-0.5 shrink-0 text-[var(--text-2)]" />
            <p className="max-w-[38rem] text-[0.875rem] leading-[1.6] text-[var(--text-2)]">
              Provider attestation always stays available. When every camera- and
              voice-based check is ruled out, a healthcare provider confirming
              your identity is the route that works for anyone &mdash; which is
              why the next step exists.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-2.5">
            <IconLock width={14} height={14} className="text-[var(--text-2)]" />
            <SimulatedBadge>
              Simulated verification &middot; no identity service is contacted
            </SimulatedBadge>
          </div>
        </div>

        <div className="h-16" />
      </div>
    </main>
  );
}
