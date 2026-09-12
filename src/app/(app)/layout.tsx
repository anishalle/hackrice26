"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AXES, AXIS_SPECS, fingerprint, stopFor } from "@/lib/capability";
import { adaptationNotes } from "@/lib/adaptation";
import { useSession } from "@/lib/session";
import { VoiceLayer } from "@/components/voice-layer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Annotation, PlotLabel, Rule } from "@/components/ui";
import { IconAgent, IconCheck, IconFeed } from "@/components/icons";

/**
 * The app shell. Two tabs, and a persistent readout of the profile that is
 * currently shaping the interface — so the adaptation is never invisible magic.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, attestation, adaptation, hydrated } = useSession();
  const notes = adaptationNotes(profile);

  const tabs = [
    { href: "/feed", label: "Feed", Icon: IconFeed, hint: "What people like you are solving" },
    { href: "/agent", label: "Agent", Icon: IconAgent, hint: "Things it does for you" },
  ];

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <header className="sticky top-0 z-30 backdrop-blur-[2px]" style={{ backgroundColor: "color-mix(in oklab, var(--bg) 88%, transparent)" }}>
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-2 px-4 py-3 sm:gap-6 sm:px-10">
          <Link
            href="/"
            className="font-mono text-[0.8125rem] tracking-[0.18em] uppercase transition-colors hover:text-[var(--brand)]"
          >
            Axis
          </Link>

          <nav aria-label="Main" className="flex items-center gap-1">
            {tabs.map(({ href, label, Icon, hint }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  title={hint}
                  className="target relative inline-flex items-center gap-2 px-2.5 text-[0.9375rem] font-medium transition-colors sm:px-4"
                  style={{ color: active ? "var(--text)" : "var(--text-2)" }}
                >
                  <Icon width={18} height={18} />
                  {label}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-2 bottom-0 h-[2px]"
                      style={{ backgroundColor: "var(--brand)" }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {hydrated && (
              <Link
                href="/profile"
                className="target hidden items-center gap-2 px-3 font-mono text-[0.75rem] text-[var(--text-2)] transition-colors hover:text-[var(--text)] sm:inline-flex"
                title="Your capability profile"
              >
                {attestation && <IconCheck width={14} height={14} className="text-[var(--accent)]" />}
                {fingerprint(profile)}
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
        <Rule />
      </header>

      <div
        className={`mx-auto grid max-w-[90rem] gap-10 py-10 px-[var(--pad-x)] lg:gap-14 ${
          adaptation.voiceFirst ? "" : "lg:grid-cols-[minmax(0,1fr)_17rem]"
        }`}
      >
        <main>{children}</main>

        {/* The standing explanation of what the profile is doing right now. */}
        {!adaptation.voiceFirst && (
        <aside className="order-first lg:order-last lg:sticky lg:top-24 lg:self-start">
          <PlotLabel>This interface, right now</PlotLabel>
          <Rule className="mt-3" />
          <div className="mt-4 grid gap-3">
            {hydrated && notes.length > 0 ? (
              notes.map((n) => (
                <Annotation key={`${n.axis}-${n.effect}`}>
                  <span className="text-[var(--text-2)]">
                    {AXIS_SPECS[n.axis].title.toLowerCase()} · {stopFor(n.axis, profile[n.axis]).code}
                  </span>
                  <br />
                  {n.effect}
                </Annotation>
              ))
            ) : (
              <p className="font-mono text-[0.75rem] leading-[1.6] text-[var(--text-2)]">
                Default rendering — your profile is at full on every axis.{" "}
                <Link href="/profile" className="underline decoration-[var(--line)]">
                  Change an axis
                </Link>{" "}
                and this screen changes with it.
              </p>
            )}
          </div>

          {hydrated && attestation && (
            <div className="mt-7">
              <Rule />
              <div className="mt-4 flex gap-2.5">
                <IconCheck width={15} height={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <p className="font-mono text-[0.75rem] leading-[1.55]" style={{ color: "var(--accent)" }}>
                  {attestation.axes.length > 0
                    ? `${attestation.axes.map((a) => AXIS_SPECS[a].title.toLowerCase()).join(", ")} attested by ${attestation.provider}`
                    : `identity attested by ${attestation.provider}`}
                </p>
              </div>
            </div>
          )}

          {hydrated && adaptation.voiceFirst && (
            <div className="mt-7">
              <Rule />
              <Annotation tone="plot" className="mt-4">
                Voice-first is on. Hold anywhere, or hold the space bar, to talk.
              </Annotation>
            </div>
          )}

          <div className="mt-7">
            <Rule />
            <p className="mt-4 font-mono text-[0.6875rem] uppercase leading-[1.6] tracking-[0.08em] text-[var(--text-2)]">
              Prototype · {AXES.length} axes · synthetic content
            </p>
          </div>
        </aside>
        )}
      </div>

      <VoiceLayer />
    </div>
  );
}
