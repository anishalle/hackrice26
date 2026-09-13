"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Canyon } from "@/components/canyon";
import { ButtonLink } from "@/components/primitives";
import { IconArrowRight } from "@/components/icons";
import { AXES, AXIS_SPECS } from "@/lib/capability";
import { useSession } from "@/lib/session";

const HEADLINE = "ALS takes your velocity. Aide gives it back.";
const SUBLINE =
  "A weekly voice check-in tracks what's changing. The interface adapts. Agents do the rest.";

export default function Home() {
  const { adaptation } = useSession();
  const reduce = useReducedMotion();
  const animate = !reduce && !adaptation.reduceMotion;

  // Typed lengths, driven by the hero's render loop so the text and the scene
  // reveal share one clock. The full strings stay in the DOM for assistive tech
  // (see the aria-labels below) — only the visible slice is animated.
  const [typed, setTyped] = useState({ head: 0, sub: 0, revealed: false });
  const onType = useCallback(
    (s: { head: number; sub: number; revealed: boolean }) => setTyped(s),
    [],
  );

  // Every load should open on the full intro — the reveal, the typing and the
  // day cycle are the pitch, and they only play once per page load. Browsers
  // restore the previous scroll position on reload, which would drop a
  // returning visitor part-way down with the hero off screen; the scene's
  // IntersectionObserver then never starts it, so they get a dead canvas
  // rather than a late one. Manual restoration is scoped to this page and
  // handed back on unmount so the rest of the app keeps native behaviour.
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  const rise = (delay: number) => ({
    initial: animate ? { opacity: 0, y: 14 } : false,
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    /* Pinned dark, whatever the app theme is set to. The token set, the ink
       and the background all come from the scoped [data-theme] rules in
       globals.css — see the note there on why the colour has to be restated
       and not just the tokens. */
    <main data-theme="dark">
      {/* ------------------------------------------------------------ hero -- */}
      <section className="relative min-h-dvh overflow-hidden">
        <Canyon
          className="pointer-events-none absolute inset-0"
          headline={HEADLINE}
          subline={SUBLINE}
          onType={onType}
        />

        {/* Legibility floor under the text. The shader is beautiful but it is
            not allowed to decide whether the headline is readable.

            The page is pinned dark, so --bg here is night navy and the first
            two layers sink the scene behind the copy rather than lifting it.
            That is what makes the cream type hold at midday, when the sky
            behind it is at its brightest.

            These stops are much lighter than the ones this carried when the
            page was cream. Then, the wash had to reach near-opaque to get
            navy text over a bright sky, and going opaque was free because it
            just read as paper. Inverted, the same numbers read as the canyon
            being switched off — so they are tuned down to the least that
            still holds cream at noon, and the scene keeps its depth at night.

            The third layer is a separate scrim under the header. It is a fixed
            colour, not a token: the header is the one band with no copy
            beneath it to darken, and cream chrome vanishes against the pale
            sky the day cycle passes through at dawn and dusk. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, color-mix(in oklab, var(--bg) 74%, transparent) 0%, color-mix(in oklab, var(--bg) 34%, transparent) 26%, transparent 58%), linear-gradient(100deg, color-mix(in oklab, var(--bg) 42%, transparent) 0%, transparent 40%), linear-gradient(to bottom, rgb(34 16 78 / 52%) 0%, rgb(34 16 78 / 26%) 45%, transparent 100%) top / 100% 8.5rem no-repeat",
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
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5.5rem)] max-w-[90rem] flex-col justify-end pb-24 px-[var(--pad-x)] sm:pb-20">
          {/* The headline and subhead type in off the hero's render clock. The
              full string is exposed to assistive tech via aria-label, so a
              screen reader gets the sentence, not a half-typed fragment. */}
          <h1
            aria-label={HEADLINE}
            className="display max-w-[24ch] min-h-[2.12em] text-[clamp(2.5rem,5.6vw,4.5rem)] text-[var(--text)]"
          >
            <span aria-hidden>{HEADLINE.slice(0, typed.head)}</span>
          </h1>

          <p
            aria-label={SUBLINE}
            className="prose-lg mt-6 !max-w-[44ch] min-h-[3.2em] text-[var(--text-2)]"
          >
            <span aria-hidden className={typed.sub > 0 ? "cursor-block" : undefined}>
              {SUBLINE.slice(0, typed.sub)}
            </span>
          </p>

          <motion.div {...rise(0.34)} className="mt-10 flex">
            <ButtonLink href="/avatar" className="h-13 rounded-full px-7 text-[1rem]">
              Plot your profile
              <IconArrowRight width={18} height={18} />
            </ButtonLink>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------ mechanism -- */}
      <section id="how" className="paper relative z-10">
        <div className="mx-auto max-w-[90rem] py-24 px-[var(--pad-x)] sm:py-32">
          <p className="eyebrow">How it works</p>
          <h2 className="display-sm mt-5 max-w-[22ch] text-[clamp(1.875rem,3.6vw,3rem)]">
            One conversation a week. Everything else follows from it.
          </h2>

          <div className="mt-16 grid gap-px overflow-hidden rounded-[var(--r)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
            <Mechanism
              n="01"
              title="You talk for a few minutes"
              body="A weekly check-in with the agent, out loud. The audio is kept: it's what the speech tracking reads pace, pauses, filler words and reply time out of, and what your voice is rebuilt from if you ever need it back."
            />
            <Mechanism
              n="02"
              title="The interface keeps up"
              body="Those speech signals sit alongside motor and eye-tracking data. Targets grow, density drops, and the interaction model changes as they move, before you have to go asking for it."
            />
            <Mechanism
              n="03"
              title="Agents carry the load"
              body="Workflows you write, and ones you install from the community, take on the errands, the forms and the follow-ups that got slow. That's the velocity coming back."
            />
          </div>

          <div className="mt-14 flex flex-wrap items-end justify-between gap-8 border-t border-[var(--line)] pt-8">
            <div>
              <p className="eyebrow">Tracked over time</p>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {AXES.map((axis) => (
                  <li key={axis} className="font-mono text-[0.875rem] text-[var(--text-2)]">
                    {AXIS_SPECS[axis].title}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex max-w-[34ch] flex-col items-start gap-4">
              <p className="font-mono text-[0.75rem] leading-[1.6] text-[var(--text-3)]">
                Your clinician can follow the same numbers between visits, so
                progression shows up without another assessment. Every profile,
                post and result here is fixture data. No real medical record is
                touched.
              </p>
              {/* Deliberately quiet. The clinician side is a small part of the
                  product, not a second front door: it is where a provider
                  follows a progression they were given access to. */}
              <Link
                href="/clinician"
                className="target inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-[var(--line)] px-4 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-[var(--text-2)] transition-colors hover:border-[var(--text-3)] hover:text-[var(--text)]"
              >
                Provider view
                <IconArrowRight width={14} height={14} />
              </Link>
            </div>
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
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="Aide, home">
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
      <span className="text-[1.0625rem] font-medium tracking-[-0.02em]">Aide</span>
    </Link>
  );
}
