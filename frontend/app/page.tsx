"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Announce } from "@/components/announce";
import { Canyon } from "@/components/canyon";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/primitives";
import { IconArrowRight } from "@/components/icons";
import { AXES, AXIS_SPECS } from "@/lib/capability";
import { useSession } from "@/lib/session";

export default function Home() {
  const { adaptation } = useSession();
  const reduce = useReducedMotion();
  const animate = !reduce && !adaptation.reduceMotion;

  const rise = (delay: number) => ({
    initial: animate ? { opacity: 0, y: 14 } : false,
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <main>
      <Announce />

      {/* ------------------------------------------------------------ hero -- */}
      <section className="relative min-h-[calc(100dvh-2.75rem)] overflow-hidden">
        <Canyon className="pointer-events-none absolute inset-0" />

        {/* Legibility floor under the text. The shader is beautiful but it is
            not allowed to decide whether the headline is readable. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, color-mix(in oklab, var(--bg) 92%, transparent) 0%, color-mix(in oklab, var(--bg) 58%, transparent) 34%, transparent 66%), linear-gradient(100deg, color-mix(in oklab, var(--bg) 72%, transparent) 0%, transparent 46%)",
          }}
        />

        <header className="on-hero relative z-20">
          <div className="mx-auto flex max-w-[90rem] items-center justify-between py-5 px-[var(--pad-x)]">
            <Wordmark />
            <nav aria-label="Main" className="flex items-center gap-1">
              <a
                href="#how"
                className="target inline-flex items-center rounded-full px-4 text-[0.9375rem] text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
              >
                How it works
              </a>
              <ThemeToggle />
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-8.25rem)] max-w-[90rem] flex-col justify-end pb-32 px-[var(--pad-x)] sm:pb-28">
          <motion.p {...rise(0.05)} className="eyebrow">
            Personal AI · Accessibility
          </motion.p>

          <motion.h1
            {...rise(0.14)}
            className="display mt-5 max-w-[16ch] text-[clamp(2.5rem,5.6vw,4.5rem)] text-[var(--text)]"
          >
            An interface that reads your capability profile.
          </motion.h1>

          <motion.p
            {...rise(0.24)}
            className="cursor-block prose-lg mt-6 !max-w-[44ch] text-[var(--text-2)]"
          >
            One profile decides two things most software decides for you: how
            you prove who you are, and what the interface becomes once
            you&rsquo;re in.
          </motion.p>

          <motion.div {...rise(0.34)} className="mt-10 flex flex-wrap items-center gap-4">
            <ButtonLink href="/profile" className="h-13 rounded-full px-7 text-[1rem]">
              Plot your profile
              <IconArrowRight width={18} height={18} />
            </ButtonLink>
            <p className="font-mono text-[0.8125rem] text-[var(--text-3)]">
              5 axes &middot; about 90 seconds
            </p>
          </motion.div>
        </div>

        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center pb-6"
        >
          <span className="eyebrow !text-[var(--text-3)]">Scroll</span>
          <span className="scroll-cue-line" />
        </div>
      </section>

      {/* ------------------------------------------------------ mechanism -- */}
      <section id="how" className="paper relative z-10">
        <div className="mx-auto max-w-[90rem] py-24 px-[var(--pad-x)] sm:py-32">
          <p className="eyebrow">The mechanism</p>
          <h2 className="display-sm mt-5 max-w-[22ch] text-[clamp(1.875rem,3.6vw,3rem)]">
            Accessibility as the input, not a compliance layer.
          </h2>

          <div className="mt-16 grid gap-px overflow-hidden rounded-[var(--r)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
            <Mechanism
              n="01"
              title="Verification that routes"
              body="A liveness check that asks you to turn your head isn't offered to someone who can't. The ruled-out checks stay on screen, each naming the exact demand that ruled it out."
            />
            <Mechanism
              n="02"
              title="Attestation, scoped"
              body="A provider corroborates the profile over a consented, field-limited query. You see every record before it's read, and refuse any of them."
            />
            <Mechanism
              n="03"
              title="An interface that regenerates"
              body="Type scale, target size, contrast, density and the interaction model all derive from the profile. Two people see different screens over the same data."
            />
          </div>

          <div className="mt-14 flex flex-wrap items-end justify-between gap-8 border-t border-[var(--line)] pt-8">
            <div>
              <p className="eyebrow">Axes on file</p>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {AXES.map((axis) => (
                  <li key={axis} className="font-mono text-[0.875rem] text-[var(--text-2)]">
                    {AXIS_SPECS[axis].title}
                  </li>
                ))}
              </ul>
            </div>
            <p className="max-w-[34ch] font-mono text-[0.75rem] leading-[1.6] text-[var(--text-3)]">
              Every profile, post and verification result below is fixture data.
              Nothing reaches a real identity service or a real medical record.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Mechanism({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="bg-[var(--bg)] p-8 sm:p-9">
      <span className="font-mono text-[0.75rem] text-[var(--brand)]">{n}</span>
      <h3 className="mt-5 text-[1.125rem] font-medium tracking-[-0.01em]">{title}</h3>
      <p className="mt-3 text-[0.9375rem] leading-[1.55] text-[var(--text-2)]">{body}</p>
    </div>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="Axis, home">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path
          d="M3 19 11 3l8 16"
          stroke="var(--brand)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M6.6 13.4h8.8" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="text-[1.0625rem] font-medium tracking-[-0.02em]">Axis</span>
    </Link>
  );
}
