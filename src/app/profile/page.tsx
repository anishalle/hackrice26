"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AXES, AXIS_SPECS, fingerprint, stopFor } from "@/lib/capability";
import { adaptationNotes, hasAdaptations } from "@/lib/adaptation";
import { routeVerification, blockedCount } from "@/lib/verification";
import { useSession } from "@/lib/session";
import { AxisPlot } from "@/components/axis-plot";
import { ThemeToggle } from "@/components/theme-toggle";
import { Annotation, ButtonLink, Panel, PlotLabel, Rule } from "@/components/ui";
import { IconArrowLeft, IconArrowRight, IconBlocked } from "@/components/icons";

/**
 * The signature surface. The profile plots live and its consequences annotate
 * themselves in the margin — the product's whole argument in one interaction.
 */
export default function ProfilePage() {
  const { profile, setAxis, setProfileComplete, adaptation, hydrated } = useSession();
  const reduce = useReducedMotion();
  const notes = adaptationNotes(profile);
  const verdicts = routeVerification(profile);
  const blocked = blockedCount(verdicts);
  const adapted = hasAdaptations(profile);
  const animate = !reduce && !adaptation.reduceMotion;

  return (
    <main className="min-h-dvh bg-[var(--bg)]">
      <div className="mx-auto max-w-[72rem] py-6 px-[var(--pad-x)]">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="target -ml-3 inline-flex items-center gap-2 px-3 font-mono text-[0.8125rem] tracking-[0.18em] uppercase text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
          >
            <IconArrowLeft width={16} height={16} />
            Axis
          </Link>
          <ThemeToggle />
        </header>

        <div className="mt-14 max-w-[34rem]">
          <PlotLabel>Step 1 of 3</PlotLabel>
          <h1 className="mt-3 display-sm text-[clamp(2rem,4.5vw,3rem)]">
            Plot your profile.
          </h1>
          <p className="prose-lg mt-5 text-[var(--text-2)]">
            Everything starts at full. Move only the axes that aren&rsquo;t true
            for you. Each change is answered in the margin with what the product
            will do differently.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">
          {/* The chart */}
          <Panel className="p-6 sm:p-8">
            <div className="flex items-baseline justify-between">
              <PlotLabel>Capability chart</PlotLabel>
              <PlotLabel className="text-[var(--brand)]">{hydrated ? fingerprint(profile) : "—"}</PlotLabel>
            </div>
            <Rule className="mt-3" />

            <div className="mt-7 grid gap-9">
              {AXES.map((axis) => (
                <AxisPlot
                  key={axis}
                  axis={axis}
                  value={profile[axis]}
                  onChange={(level) => setAxis(axis, level)}
                />
              ))}
            </div>
          </Panel>

          {/* The margin: consequences, drawn as they're decided */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <PlotLabel>What changes</PlotLabel>
            <Rule className="mt-3" />

            <div className="mt-5 grid gap-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {adapted ? (
                  notes.map((note) => (
                    <motion.div
                      key={`${note.axis}-${note.effect}`}
                      layout={animate}
                      initial={animate ? { opacity: 0, x: -6 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      exit={animate ? { opacity: 0, x: -6 } : { opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Annotation>
                        <span className="text-[var(--text-2)]">
                          {AXIS_SPECS[note.axis].title.toLowerCase()} &middot;{" "}
                          {stopFor(note.axis, profile[note.axis]).code}
                        </span>
                        <br />
                        {note.effect}
                      </Annotation>
                    </motion.div>
                  ))
                ) : (
                  <motion.p
                    key="empty"
                    initial={false}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-[0.75rem] leading-[1.6] text-[var(--text-2)]"
                  >
                    Nothing yet. At full on every axis the interface stays as it
                    is — which is the point: the profile only ever adds routes,
                    it never removes them.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {blocked > 0 && (
              <motion.div
                layout={animate}
                initial={animate ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                className="mt-8"
              >
                <Rule />
                <div className="mt-5 flex gap-2.5">
                  <IconBlocked width={16} height={16} className="mt-0.5 shrink-0 text-[var(--brand)]" />
                  <p className="text-[0.875rem] leading-[1.55]">
                    <span className="font-mono tabular-nums text-[var(--brand)]">{blocked}</span> of{" "}
                    <span className="font-mono tabular-nums">{verdicts.length}</span> standard identity
                    checks would lock you out. The next step routes around them.
                  </p>
                </div>
              </motion.div>
            )}
          </aside>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <ButtonLink href="/verify" className="h-12" onClick={() => setProfileComplete(true)}>
            Continue to verification
            <IconArrowRight width={18} height={18} />
          </ButtonLink>
          <p className="font-mono text-[0.75rem] text-[var(--text-2)]">
            You can change any axis later without re-verifying.
          </p>
        </div>

        <div className="h-16" />
      </div>
    </main>
  );
}
