"use client";

import Link from "next/link";
import {
  canRead,
  careTeamFor,
  CLINICIAN_LIST,
  CLINICIANS,
  isAssigned,
  RECORD_SCOPES,
  type RecordScopeId,
} from "@/lib/care";
import {
  formatDuration,
  hasFullRecord,
  recordsFor,
  type Recording,
} from "@/lib/records";
import { useSession } from "@/lib/session";
import { Avatar } from "@/components/avatar";
import { ScoreBar, SeriesRow } from "@/components/spark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Panel, PlotLabel, Rule } from "@/components/primitives";
import { IconArrowLeft, IconBlocked, IconLock } from "@/components/icons";

/**
 * The long record: every instrument the check-ins have fed, gated per viewer.
 *
 * This is the screen where the access rules earn their keep, so it renders its
 * refusals rather than its permissions. A section the viewing clinician cannot
 * read still appears, named, with the resource it would have come from and what
 * would unlock it. The alternative (quietly omitting it) produces a screen that
 * looks complete to someone who is missing half of it, which in a clinic is the
 * failure mode that actually hurts.
 *
 * Everything is fixture data and says so. See lib/care.ts on why this gate is a
 * product surface rather than a security boundary.
 */
export default function RecordsPage() {
  const { patient, viewerClinicianId, setViewerClinician } = useSession();
  const viewer = CLINICIANS[viewerClinicianId] ?? CLINICIAN_LIST[0];
  const assigned = isAssigned(viewer.id, patient.id);
  const records = recordsFor(patient.id);
  const team = careTeamFor(patient.id);

  const gate = (scope: RecordScopeId) => canRead(viewer.id, patient.id, scope);

  return (
    <main className="paper min-h-dvh">
      <div className="mx-auto max-w-[72rem] py-6 px-[var(--pad-x)]">
        <header className="flex items-center justify-between">
          <Link
            href="/profile"
            className="btn-lift target -ml-3 inline-flex items-center gap-2 px-3 font-mono text-[0.8125rem] tracking-[0.18em] uppercase text-[var(--text-2)] hover:text-[var(--text)]"
          >
            <IconArrowLeft width={16} height={16} />
            Record
          </Link>
          <ThemeToggle />
        </header>

        {/* Who is looking. A real deployment reads this from the authenticated
            session; here it switches so the rules below can be demonstrated. */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[var(--r)] border border-[var(--line)] bg-[var(--surface-2)] p-4">
          <div className="flex items-center gap-2.5">
            <IconLock width={16} height={16} className="shrink-0 text-[var(--accent)]" />
            <p className="font-mono text-[0.75rem] uppercase tracking-[0.1em] text-[var(--text-2)]">
              Viewing as
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CLINICIAN_LIST.map((c) => {
              const on = c.id === viewer.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setViewerClinician(c.id)}
                  className={`btn-lift target rounded-[var(--r-pill)] border px-4 text-left text-[0.8125rem] ${
                    on
                      ? "border-[var(--brand)] bg-[var(--brand-dim)] text-[var(--text)]"
                      : "border-[var(--line)] text-[var(--text-2)] hover:border-[var(--text-3)]"
                  }`}
                >
                  <span className="block leading-tight">{c.name}</span>
                  <span className="block font-mono text-[0.625rem] uppercase tracking-[0.1em] text-[var(--text-3)]">
                    {c.role}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <Avatar
            seed={patient.avatar.seed}
            hue={patient.avatar.hue}
            tone={patient.avatar.tone}
            expression={patient.avatar.expression}
            size={64}
            label={patient.name}
          />
          <div>
            <PlotLabel>Full record</PlotLabel>
            <h1 className="mt-2 display-sm text-[clamp(1.75rem,4vw,2.5rem)]">{patient.name}</h1>
            <p className="mt-1 font-mono text-[0.8125rem] text-[var(--text-3)]">
              {patient.diagnosis} &middot; {patient.since}
            </p>
          </div>
        </div>

        <p
          className="mt-8 max-w-[44rem] rounded-[var(--r)] p-4 font-mono text-[0.75rem] leading-[1.6] text-[var(--text-2)]"
          style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}
        >
          Simulated. Every measurement, recording and score below is fixture
          data modelled on what these instruments look like, not taken from any
          person. Nothing here is a clinical fact and no real record is read.
        </p>

        {/* Gate one: relationship. Failing it is a different answer from an
            empty record, so it takes the whole page rather than each section. */}
        {!assigned ? (
          <NoRelationship patientName={patient.name} viewerName={viewer.name} team={team} />
        ) : !hasFullRecord(patient.id) ? (
          <Panel className="mt-10 p-8">
            <p className="text-[0.9375rem] text-[var(--text-2)]">
              No long record on file for {patient.name.split(" ")[0]} yet. The
              weekly signals on their record screen are the whole history so far.
            </p>
          </Panel>
        ) : (
          <>
            <Section
              title="Weekly signals"
              scope="signals"
              verdict={gate("signals")}
              count={`${records.series.filter((s) => s.scope === "signals").length} tracked`}
            >
              <div className="divide-y divide-[var(--line-soft)]">
                {records.series
                  .filter((s) => s.scope === "signals")
                  .map((s) => (
                    <SeriesRow key={s.id} series={s} />
                  ))}
              </div>
            </Section>

            <Section
              title="Check-in recordings"
              scope="recordings"
              verdict={gate("recordings")}
              count={`${records.recordings.length} on file`}
            >
              <ul className="divide-y divide-[var(--line-soft)]">
                {records.recordings.map((r) => (
                  <li key={r.id}>
                    <RecordingRow recording={r} />
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              title="Voice preservation"
              scope="voicebank"
              verdict={gate("voicebank")}
              count={
                records.voiceBank
                  ? `${records.voiceBank.banked.toLocaleString()} of ${records.voiceBank.target.toLocaleString()}`
                  : undefined
              }
            >
              {records.voiceBank && (
                <div className="grid gap-8 py-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[2rem] tabular-nums leading-none">
                        {records.voiceBank.banked.toLocaleString()}
                      </span>
                      <span className="font-mono text-[0.8125rem] text-[var(--text-3)]">
                        of {records.voiceBank.target.toLocaleString()} phrases
                      </span>
                    </div>

                    <span
                      role="img"
                      aria-label={`${records.voiceBank.banked} of ${records.voiceBank.target} phrases banked`}
                      className="mt-4 block h-2 w-full overflow-hidden rounded-full"
                      style={{ backgroundColor: "var(--line)" }}
                    >
                      <span
                        aria-hidden
                        className="block h-full rounded-full"
                        style={{
                          width: `${(records.voiceBank.banked / records.voiceBank.target) * 100}%`,
                          backgroundColor: "var(--signal-mint)",
                        }}
                      />
                    </span>

                    <dl className="mt-6 grid gap-3">
                      <div>
                        <dt className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-[var(--text-3)]">
                          Readiness
                        </dt>
                        <dd className="mt-1 text-[0.875rem] text-[var(--text-2)]">
                          {records.voiceBank.readiness}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-[var(--text-3)]">
                          Quality
                        </dt>
                        <dd className="mt-1 text-[0.875rem] text-[var(--text-2)]">
                          {records.voiceBank.quality}
                        </dd>
                      </div>
                    </dl>

                    {/* The growth curve lives in the signals list but is scoped
                        to voicebank, so it renders here where it belongs. */}
                    {records.series
                      .filter((s) => s.scope === "voicebank")
                      .map((s) => (
                        <div key={s.id} className="mt-6 border-t border-[var(--line-soft)]">
                          <SeriesRow series={s} />
                        </div>
                      ))}
                  </div>

                  <div>
                    <PlotLabel>Recent sittings</PlotLabel>
                    <Rule className="mt-3" />
                    <ul className="mt-4 grid gap-3">
                      {records.voiceBank.sessions.map((s) => (
                        <li key={s.date} className="flex items-baseline justify-between gap-3">
                          <span className="font-mono text-[0.75rem] text-[var(--text-2)]">
                            {s.date}
                          </span>
                          <span className="font-mono text-[0.75rem] tabular-nums text-[var(--text-3)]">
                            {s.phrases} phrases &middot; {s.minutes}m
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Section>

            <Section
              title="Functional scores"
              scope="function"
              verdict={gate("function")}
              count={`${records.functional.length} assessments`}
            >
              <div className="grid gap-8 py-5 sm:grid-cols-2 sm:gap-12">
                {records.functional.map((f) => (
                  <div key={f.date}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-[0.8125rem] text-[var(--text-2)]">
                        {f.date}
                      </span>
                      <span className="font-mono text-[0.875rem] tabular-nums">
                        {f.total}/{f.max}
                      </span>
                    </div>
                    <Rule className="mt-3" />
                    <div className="mt-4 grid gap-2.5">
                      {f.domains.map((d) => (
                        <ScoreBar key={d.label} label={d.label} score={d.score} max={d.max} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              title="Respiratory"
              scope="respiratory"
              verdict={gate("respiratory")}
              count={`${records.series.filter((s) => s.scope === "respiratory").length} tracked`}
            >
              <div className="divide-y divide-[var(--line-soft)]">
                {records.series
                  .filter((s) => s.scope === "respiratory")
                  .map((s) => (
                    <SeriesRow key={s.id} series={s} />
                  ))}
              </div>
            </Section>

            <div className="mt-14">
              <PlotLabel>Care team</PlotLabel>
              <Rule className="mt-3" major />
              <ul className="mt-5 grid gap-3">
                {team.map(({ clinician, since }) => (
                  <li
                    key={clinician.id}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1"
                  >
                    <div>
                      <p className="text-[0.9375rem]">{clinician.name}</p>
                      <p className="font-mono text-[0.75rem] text-[var(--text-3)]">
                        {clinician.role} &middot; added {since}
                      </p>
                    </div>
                    <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--text-2)]">
                      {clinician.scopes.map((s) => RECORD_SCOPES[s].label).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 max-w-[52ch] font-mono text-[0.75rem] leading-[1.6] text-[var(--text-3)]">
                {patient.name.split(" ")[0]} added every clinician on this list and
                chose what each of them can read. Only they can change it, and
                removing someone takes effect immediately.
              </p>
            </div>
          </>
        )}

        <div className="h-16" />
      </div>
    </main>
  );
}

/**
 * A section of the record, or the reason it is not shown.
 *
 * The refusal carries the same weight as the content: same heading, same rule,
 * same place in the page. Only the body differs.
 */
function Section({
  title,
  scope,
  verdict,
  count,
  children,
}: {
  title: string;
  scope: RecordScopeId;
  verdict: ReturnType<typeof canRead>;
  count?: string;
  children: React.ReactNode;
}) {
  const spec = RECORD_SCOPES[scope];

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[1.0625rem] font-medium tracking-[-0.01em]">{title}</h2>
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--text-3)]">
          {verdict.allowed ? count : spec.resource}
        </p>
      </div>
      <Rule className="mt-3" major />

      {verdict.allowed ? (
        children
      ) : (
        <div className="mt-5 flex gap-3 rounded-[var(--r)] border border-dashed border-[var(--line)] p-5">
          <IconBlocked width={16} height={16} className="mt-0.5 shrink-0 text-[var(--text-3)]" />
          <div className="min-w-0">
            <p className="text-[0.875rem] leading-[1.55] text-[var(--text-2)]">{verdict.detail}</p>
            <p className="mt-2 font-mono text-[0.75rem] leading-[1.5] text-[var(--text-3)]">
              {spec.covers}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function NoRelationship({
  patientName,
  viewerName,
  team,
}: {
  patientName: string;
  viewerName: string;
  team: ReturnType<typeof careTeamFor>;
}) {
  return (
    <Panel className="mt-10 p-8">
      <div className="flex gap-4">
        <IconBlocked width={20} height={20} className="mt-0.5 shrink-0 text-[var(--brand)]" />
        <div>
          <h2 className="text-[1.0625rem] font-medium">No access to this record</h2>
          <p className="mt-3 max-w-[54ch] text-[0.9375rem] leading-[1.6] text-[var(--text-2)]">
            {viewerName} is not on {patientName.split(" ")[0]}&rsquo;s care team,
            so none of this record is readable. This is a missing relationship
            rather than an empty record: there is data here, and it is not yours
            to see.
          </p>
          <p className="mt-4 max-w-[54ch] text-[0.875rem] leading-[1.6] text-[var(--text-2)]">
            {patientName.split(" ")[0]} can add you from their own device. Their
            current care team is {team.map((t) => t.clinician.name).join(", ")}.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function RecordingRow({ recording }: { recording: Recording }) {
  const kindLabel =
    recording.kind === "check-in"
      ? "Check-in"
      : recording.kind === "banking"
        ? "Banking sitting"
        : "Voice note";

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4">
      <span className="font-mono text-[0.75rem] tabular-nums text-[var(--text-3)]">
        {recording.date}
      </span>
      <span className="rounded-[var(--r-pill)] border border-[var(--line)] px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-[var(--text-2)]">
        {kindLabel}
      </span>
      <span className="font-mono text-[0.75rem] tabular-nums">
        {formatDuration(recording.durationSec)}
      </span>
      {recording.transcript && (
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-[var(--text-3)]">
          transcript kept
        </span>
      )}
      <p className="w-full max-w-[62ch] text-[0.875rem] leading-[1.5] text-[var(--text-2)]">
        {recording.note}
      </p>
    </div>
  );
}
