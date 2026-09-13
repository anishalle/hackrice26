"use client";

import { ViewTransition } from "react";
import { usePatients } from "@/lib/patient-api";
import { PatientAnalyticsPanel } from "@/components/patient-analytics";
import { SavePatientProfile } from "@/components/save-patient-profile";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AXES, AXIS_SPECS, fingerprint, stopFor } from "@/lib/capability";
import { adaptationNotes, deriveAdaptation, hasAdaptations } from "@/lib/adaptation";
import { routeVerification, blockedCount } from "@/lib/verification";
import { trendsForAxis, type Trend } from "@/lib/patients";
import { useSession } from "@/lib/session";
import { GazingAvatar } from "@/components/avatar-gaze";
import { AxisPlot } from "@/components/axis-plot";
import { ThemeToggle } from "@/components/theme-toggle";
import { Annotation, ButtonLink, Panel, PlotLabel, Rule } from "@/components/primitives";
import { IconArrowLeft, IconArrowRight, IconBlocked } from "@/components/icons";

/**
 * The record: one patient, their measurements, and the profile derived from them.
 *
 * The screen's argument is the pairing. Each axis is a control the clinician
 * moves, and directly under it sit the numbers this patient's check-ins
 * actually produced for that axis. Moving the speech axis with "speaking rate
 * 132 wpm, down 6 this week" sitting beneath it is a decision with a reason
 * attached; the same move on a screen that only showed the control would not
 * be. The margin then answers with what the interface does about it, so the
 * whole causal chain (measured, decided, rendered) is visible at once.
 *
 * The clinician's own interface deliberately does not adapt here. See the note
 * on `adaptation` in lib/session.tsx.
 */
export default function ProfilePage() {
  const router = useRouter();
  const { patient, profile, setAxis, setPreviewing, adaptation, hydrated } = useSession();
  const reduce = useReducedMotion();
  const catalog = usePatients();
  const notes = adaptationNotes(profile);
  const verdicts = routeVerification(profile);
  const blocked = blockedCount(verdicts);
  const adapted = hasAdaptations(profile);
  const animate = !reduce && !adaptation.reduceMotion;

  // What the patient's app becomes, which is not what this screen is rendered
  // at. Derived straight from the profile rather than read off the session, so
  // the summary below is honest even though the clinician is not in a preview.
  const theirs = deriveAdaptation(profile);

  const openPreview = () => {
    setPreviewing(true);
    router.push("/feed");
  };

  if (catalog.status !== "ready") return <main className="paper min-h-dvh p-8">
    <p role={catalog.error ? "alert" : "status"}>{catalog.error ?? "Loading patient record from PostgreSQL…"}</p>
    {catalog.error && <button className="target underline" onClick={() => void catalog.retry()}>Retry</button>}
    <Link href="/clinician" className="block mt-4 underline">Back to caseload</Link>
  </main>;

  return (
    <main className="paper min-h-dvh">
      <div className="mx-auto max-w-[72rem] py-6 px-[var(--pad-x)]">
        <header className="flex items-center justify-between">
          <Link
            href="/clinician"
            className="btn-lift target -ml-3 inline-flex items-center gap-2 px-3 font-mono text-[0.8125rem] tracking-[0.18em] uppercase text-[var(--text-2)] hover:text-[var(--text)]"
          >
            <IconArrowLeft width={16} height={16} />
            Caseload
          </Link>
          <ThemeToggle />
        </header>

        {/* Column-reverse below lg so the face still sits above the copy when
            this stacks, even though the copy now comes first in the DOM. */}
        <div className="mt-6 flex flex-col-reverse gap-7 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="max-w-[34rem]">
            <PlotLabel>Patient record</PlotLabel>
            <h1 className="mt-3 display-sm text-[clamp(2rem,4.5vw,3rem)]">{patient.name}</h1>
            <p className="mt-3 font-mono text-[0.8125rem] text-[var(--text-3)]">
              {patient.diagnosis} &middot; {patient.since}
            </p>
            <p className="prose-lg mt-5 text-[var(--text-2)]">
              Every axis starts where you last left it. The numbers under each
              one are what this patient&rsquo;s check-ins measured, so you are
              moving a control with its evidence in front of you.
            </p>
          </div>

          {/* Decorative: the page names the patient in text, so the face is not
              carrying identity a screen reader needs read out. That is also why
              it can sit after the copy in the DOM and be moved right visually. */}
          <ViewTransition name="blobatar">
            <GazingAvatar
              seed={patient.avatar.seed}
              hue={patient.avatar.hue}
              tone={patient.avatar.tone}
              expression={patient.avatar.expression}
              size={372}
              travel={6}
              className="block h-auto max-w-full shrink-0"
            />
          </ViewTransition>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">
          {/* The chart: control and evidence, axis by axis */}
          <Panel className="p-6 sm:p-8">
            <div className="flex items-baseline justify-between">
              <PlotLabel>Capability chart</PlotLabel>
              <PlotLabel className="text-[var(--brand)]">
                {hydrated ? fingerprint(profile) : "·"}
              </PlotLabel>
            </div>
            <Rule className="mt-3" />

            <div className="mt-7 grid gap-9">
              {AXES.map((axis) => {
                const trends = trendsForAxis(patient, axis);
                return (
                  <div key={axis}>
                    <AxisPlot
                      axis={axis}
                      value={profile[axis]}
                      onChange={(level) => setAxis(axis, level)}
                    />
                    {trends.length > 0 && (
                      /* Offset to sit under the track rather than the axis
                         label, matching AxisPlot's own two-column split, so
                         the evidence lines up with the control it explains. */
                      <div className="mt-3 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-6">
                        <div aria-hidden />
                        <ul className="grid gap-1.5">
                          {trends.map((t) => (
                            <li key={t.id}>
                              <TrendLine trend={t} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* The margin: consequences, drawn as they're decided */}
          <aside className="lg:sticky lg:top-8 lg:self-start lg:pt-[1.625rem]">
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
                    is, which is the point: the profile only ever adds routes, it
                    never removes them.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* The concrete numbers the profile produces. The margin above says
                what changes in words; this says it in the units the app is
                actually built in, which is what makes the preview predictable
                rather than a surprise. */}
            <div className="mt-8">
              <Rule />
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
                <Metric label="Type scale" value={`${theirs.typeScale}×`} />
                <Metric label="Target size" value={`${theirs.targetSize}px`} />
                <Metric label="Density" value={theirs.density} />
                <Metric label="Leads with" value={theirs.voiceFirst ? "voice" : "screen"} />
              </dl>
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
                    <span className="font-mono tabular-nums">{verdicts.length}</span> standard
                    identity checks would lock {patient.name.split(" ")[0]} out.
                  </p>
                </div>
              </motion.div>
            )}
          </aside>
        </div>

        {/* The check-ins the numbers came from. Last, because it is the
            provenance rather than the decision. */}
        <SavePatientProfile key={`${patient.id}:${fingerprint(profile)}`} patientId={patient.id} profile={profile} />
        <PatientAnalyticsPanel key={patient.id} patientId={patient.id} />

        <div className="mt-14">
          <div className="flex items-baseline justify-between">
            <PlotLabel>Check-in history</PlotLabel>
            <PlotLabel className="text-[var(--text-3)]">
              {patient.checkins.length}{" "}
              <span className="lowercase tracking-normal">recorded</span>
            </PlotLabel>
          </div>
          <Rule className="mt-3" major />

          <ul className="mt-6 grid gap-px overflow-hidden rounded-[var(--r)] border border-[var(--line)] bg-[var(--line)]">
            {patient.checkins.map((c) => (
              <li key={c.id} className="bg-[var(--bg)] p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-[0.9375rem] font-medium">{c.title}</h3>
                  <span className="font-mono text-[0.75rem] text-[var(--text-3)]">{c.date}</span>
                </div>
                <p className="mt-2 max-w-[60ch] text-[0.875rem] leading-[1.55] text-[var(--text-2)]">
                  {c.summary}
                </p>
                <ul className="mt-3 grid gap-1.5">
                  {c.flags.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: `var(--signal-${f.tone})` }}
                      />
                      <span className="font-mono text-[0.75rem] leading-[1.5] text-[var(--text-2)]">
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={openPreview}
            className="btn-lift target inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-pill)] bg-[var(--solid)] px-7 text-[0.9375rem] font-medium text-[var(--solid-ink)]"
          >
            Open the app as {patient.name.split(" ")[0]}
            <IconArrowRight width={18} height={18} />
          </button>
          <ButtonLink href="/records" variant="secondary" className="h-12">
            Full record
            <IconArrowRight width={18} height={18} />
          </ButtonLink>
          <ButtonLink href="/clinician" variant="quiet" className="h-12">
            Back to caseload
          </ButtonLink>
          <p className="font-mono text-[0.75rem] text-[var(--text-2)]">
            The preview renders the real app at this profile. You can leave it at
            any time.
          </p>
        </div>

        <div className="h-16" />
      </div>
    </main>
  );
}

/** One measurement, tinted by how it is moving. */
function TrendLine({ trend }: { trend: Trend }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full"
        style={{ backgroundColor: `var(--signal-${trend.tone})` }}
      />
      <span className="font-mono text-[0.75rem] text-[var(--text-2)]">{trend.label}</span>
      <span className="font-mono text-[0.75rem] tabular-nums font-medium">{trend.value}</span>
      <span className="font-mono text-[0.75rem] text-[var(--text-3)]">{trend.delta}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-[var(--text-3)]">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-[0.875rem] tabular-nums">{value}</dd>
    </div>
  );
}
