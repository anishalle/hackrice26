"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AXES, fingerprint, type Profile } from "@/lib/capability";
import { flaggedTrendCount, PATIENTS, type Patient } from "@/lib/patients";
import { useSession } from "@/lib/session";
import { Avatar } from "@/components/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Panel, PlotLabel, Rule } from "@/components/primitives";
import { IconArrowLeft, IconArrowRight } from "@/components/icons";

/**
 * The caseload: every patient this clinician follows, focus patient first.
 *
 * This screen used to be a reader on principle, on the argument that a
 * capability profile belongs to the person it describes and a provider editing
 * it would invert that. The product has since moved: the clinician is the one
 * who plots, because the thing being plotted is now downstream of measurements
 * the weekly check-in took rather than of a self-report the person entered. The
 * person still owns the profile; the clinician is reading the evidence and
 * proposing where it lands, which is the job they already do in a room.
 *
 * That reversal is worth being deliberate about rather than letting it happen
 * quietly, which is why the note is here and not deleted.
 *
 * On honesty, per PRODUCT.md: there is no provider partnership, no compliance
 * posture and no real record anywhere in this. Every patient below is fixture
 * data. The labelling is not decoration: the one thing this screen must never
 * do is read as a real clinical system.
 */
export default function ClinicianPage() {
  const router = useRouter();
  const { setActivePatient, setPreviewing, patientProfiles, hydrated } = useSession();

  const open = (id: string) => {
    setActivePatient(id);
    router.push("/profile");
  };

  // Straight into the patient's own app, skipping the record. Same destination
  // as the button on the record screen; this one exists because the question
  // "what does this actually look like for them" is usually the first one
  // asked, not the last.
  const viewAs = (id: string) => {
    setActivePatient(id);
    setPreviewing(true);
    router.push("/feed");
  };

  return (
    <main className="paper min-h-dvh">
      <div className="mx-auto max-w-[72rem] py-6 px-[var(--pad-x)]">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="btn-lift target -ml-3 inline-flex items-center gap-2 px-3 font-mono text-[0.8125rem] tracking-[0.18em] uppercase text-[var(--text-2)] hover:text-[var(--text)]"
          >
            <IconArrowLeft width={16} height={16} />
            Aide
          </Link>
          <ThemeToggle />
        </header>

        <div className="mt-6 max-w-[38rem]">
          <PlotLabel>Clinician view</PlotLabel>
          <h1 className="mt-3 display-sm text-[clamp(2rem,4.5vw,3rem)]">Your caseload.</h1>
          <p className="prose-lg mt-5 text-[var(--text-2)]">
            Each person checks in with the agent once a week. Open a record to
            see what those check-ins measured and to set where each axis of their
            profile sits. What you set is what their app becomes.
          </p>
        </div>

        {/* Not a footnote. This screen impersonates a clinical system more
            convincingly than any other in the build, so the disclaimer sits
            above the data rather than under it. */}
        <p
          className="mt-8 max-w-[38rem] rounded-[var(--r)] p-4 font-mono text-[0.75rem] leading-[1.6] text-[var(--text-2)]"
          style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}
        >
          Simulated. Every patient, measurement and check-in below is fixture
          data. No real medical record is read or written, and no provider was
          consulted.
        </p>

        <div className="mt-10 flex items-baseline justify-between">
          <PlotLabel>Patients</PlotLabel>
          <PlotLabel className="text-[var(--text-3)]">
            {PATIENTS.length} <span className="lowercase tracking-normal">on file</span>
          </PlotLabel>
        </div>
        <Rule className="mt-3" major />

        <ul className="mt-6 grid gap-3">
          {PATIENTS.map((p) => (
            <li key={p.id}>
              <PatientRow
                patient={p}
                /* The edit, not the fixture. A row that announced "edited this
                   session" while printing the profile the patient arrived with
                   would be showing the one number it was claiming had moved. */
                profile={(hydrated && patientProfiles[p.id]) || p.profile}
                edited={hydrated && p.id in patientProfiles}
                onOpen={() => open(p.id)}
                onViewAs={() => viewAs(p.id)}
              />
            </li>
          ))}
        </ul>

        <div className="h-16" />
      </div>
    </main>
  );
}

function PatientRow({
  patient,
  profile,
  edited,
  onOpen,
  onViewAs,
}: {
  patient: Patient;
  profile: Profile;
  edited: boolean;
  onOpen: () => void;
  onViewAs: () => void;
}) {
  const flagged = flaggedTrendCount(patient);

  return (
    <Panel
      as="article"
      className={`p-5 sm:p-6 ${patient.focus ? "ring-1 ring-[var(--brand)]" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-5">
        <Avatar
          seed={patient.avatar.seed}
          hue={patient.avatar.hue}
          tone={patient.avatar.tone}
          expression={patient.avatar.expression}
          size={56}
          label={patient.name}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-[1.0625rem] font-medium tracking-[-0.01em]">{patient.name}</h2>
            {patient.focus && (
              <span className="rounded-[var(--r-pill)] bg-[var(--brand-dim)] px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-[var(--brand)]">
                Focus patient
              </span>
            )}
            {edited && (
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-[var(--text-3)]">
                edited this session
              </span>
            )}
          </div>
          <p className="mt-1 text-[0.875rem] text-[var(--text-2)]">{patient.diagnosis}</p>
          <p className="mt-0.5 font-mono text-[0.75rem] text-[var(--text-3)]">
            {patient.since} &middot; {fingerprint(profile)}
          </p>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="font-mono text-[1.25rem] tabular-nums leading-none text-[var(--brand)]">
              {flagged}
            </p>
            <p className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-[var(--text-3)]">
              {flagged === 1 ? "signal" : "signals"} moving
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onViewAs}
              className="btn-lift target inline-flex items-center gap-2 rounded-[var(--r-pill)] bg-[var(--solid)] px-5 text-[0.875rem] font-medium text-[var(--solid-ink)]"
            >
              {patient.name.split(" ")[0]}&rsquo;s view
            </button>
            <button
              type="button"
              onClick={onOpen}
              className="btn-lift target inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-[var(--line)] px-5 text-[0.875rem] font-medium hover:border-[var(--text-3)]"
            >
              Open record
              <IconArrowRight width={16} height={16} />
            </button>
          </div>
        </div>
      </div>

      {/* The axes this person's own check-ins speak to, so a row carries some
          of what is inside it rather than only a count. */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-[var(--line-soft)] pt-3">
        {AXES.filter((a) => patient.trends.some((t) => t.axis === a)).map((a) => (
          <span key={a} className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--text-3)]">
            {a}
          </span>
        ))}
      </div>
    </Panel>
  );
}
