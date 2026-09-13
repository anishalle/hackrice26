"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AXES, AXIS_SPECS, DEFAULT_PROFILE, fingerprint, stopFor, type Axis, type Profile } from "@/lib/capability";
import { adaptationNotes } from "@/lib/adaptation";
import { AUTHORS } from "@/lib/fixtures";
import { Avatar } from "@/components/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Annotation, Panel, PlotLabel, Rule } from "@/components/primitives";
import { IconArrowLeft, IconCheck } from "@/components/icons";

/**
 * The provider side.
 *
 * Deliberately a reader, not an editor. A clinician looking at this can see
 * which axes a person has attested and what the product does about them, and
 * that is all — nothing here writes to a profile. The capability profile
 * belongs to the person it describes, and a screen that let a provider edit it
 * would quietly invert that.
 *
 * On honesty, per PRODUCT.md: there is no provider partnership, no compliance
 * posture and no real record anywhere in this. Every patient below is one of
 * the feed's fixture authors. The labelling is not decoration — the one thing
 * this screen must never do is read as a real clinical system.
 */

type Patient = {
  id: string;
  name: string;
  profile: Profile;
  attested: Axis[];
};

// The feed's authors, promoted to full profiles. They post about the barriers
// their axes create, so the same five people showing up here is the point:
// this is the other end of the story the feed already tells.
const PATIENTS: Patient[] = Object.values(AUTHORS).map((a) => ({
  id: a.id,
  name: a.name,
  profile: { ...DEFAULT_PROFILE, ...a.profile },
  attested: a.attested,
}));

export default function ClinicianPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <main className="paper min-h-dvh">
      <div className="mx-auto max-w-[72rem] py-6 px-[var(--pad-x)]">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="target -ml-3 inline-flex items-center gap-2 px-3 font-mono text-[0.8125rem] tracking-[0.18em] uppercase text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
          >
            <IconArrowLeft width={16} height={16} />
            Aide
          </Link>
          <ThemeToggle />
        </header>

        <div className="mt-14 max-w-[38rem]">
          <PlotLabel>Provider view</PlotLabel>
          <h1 className="mt-3 display-sm text-[clamp(2rem,4.5vw,3rem)]">
            The profiles you&rsquo;ve attested.
          </h1>
          <p className="prose-lg mt-5 text-[var(--text-2)]">
            Each person below asked a provider to corroborate specific axes of
            their capability profile. You can see what was attested and what the
            product does with it. You cannot change anyone&rsquo;s profile from
            here. It belongs to them.
          </p>
        </div>

        {/* Not a footnote. This screen impersonates a clinical system more
            convincingly than any other in the build, so the disclaimer sits
            above the data rather than under it. */}
        <div
          className="mt-8 flex max-w-[38rem] gap-3 rounded-[var(--r)] p-4"
          style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}
        >
          <p className="font-mono text-[0.75rem] leading-[1.6] text-[var(--text-2)]">
            <span className="text-[var(--warn)]">Simulated.</span> These are the
            same five fixture people who post in the feed. No provider was
            consulted, no record was read, and nothing here is a medical record
            or a compliance posture.
          </p>
        </div>

        <div className="mt-12 flex items-baseline justify-between">
          <PlotLabel>Patients</PlotLabel>
          <PlotLabel className="text-[var(--text-3)]">
            {PATIENTS.length} <span className="lowercase tracking-normal">on file</span>
          </PlotLabel>
        </div>
        <Rule className="mt-3" />

        <ul className="mt-6 grid gap-4">
          {PATIENTS.map((p) => (
            <PatientRow
              key={p.id}
              patient={p}
              open={openId === p.id}
              onToggle={() => setOpenId((v) => (v === p.id ? null : p.id))}
            />
          ))}
        </ul>

        <div className="h-16" />
      </div>
    </main>
  );
}

function PatientRow({
  patient,
  open,
  onToggle,
}: {
  patient: Patient;
  open: boolean;
  onToggle: () => void;
}) {
  const notes = useMemo(() => adaptationNotes(patient.profile), [patient.profile]);
  const lowered = AXES.filter((a) => patient.profile[a] < 3);

  return (
    <li>
      <Panel as="article" className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {/* Decorative: the name is right beside it. */}
          <Avatar seed={patient.id} size={34} />

          <span className="text-[0.9375rem] font-medium">{patient.name}</span>

          <span className="font-mono text-[0.8125rem] tabular-nums text-[var(--brand)]">
            {fingerprint(patient.profile)}
          </span>

          {patient.attested.length > 0 && (
            <span
              className="inline-flex items-center gap-1 font-mono text-[0.6875rem] uppercase tracking-[0.08em]"
              style={{ color: "var(--accent)" }}
            >
              <IconCheck width={12} height={12} />
              {patient.attested.map((a) => AXIS_SPECS[a].title.toLowerCase()).join(", ")} attested
            </span>
          )}

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="target ml-auto rounded-[var(--r-pill)] px-3 font-mono text-[0.75rem] text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            {open ? "hide" : "what this changes"}
          </button>
        </div>

        {open && (
          <div className="mt-5">
            <Rule />
            <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
              <div>
                <PlotLabel>Axes below full</PlotLabel>
                {lowered.length === 0 ? (
                  <p className="mt-3 text-[0.875rem] text-[var(--text-2)]">
                    None. This profile is at full on every axis.
                  </p>
                ) : (
                  <ul className="mt-3 grid gap-2">
                    {lowered.map((a) => (
                      <li key={a} className="font-mono text-[0.75rem] text-[var(--text-2)]">
                        {AXIS_SPECS[a].title.toLowerCase()} &middot;{" "}
                        <span className="text-[var(--text)]">
                          {stopFor(a, patient.profile[a]).code}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <PlotLabel>What the product does</PlotLabel>
                {notes.length === 0 ? (
                  <p className="mt-3 text-[0.875rem] text-[var(--text-2)]">
                    Nothing. At full on every axis the interface stays as it is.
                  </p>
                ) : (
                  <ul className="mt-3 grid gap-2.5">
                    {notes.map((n) => (
                      <li key={`${n.axis}-${n.effect}`}>
                        <Annotation>{n.effect}</Annotation>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </li>
  );
}
