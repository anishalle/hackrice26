"use client";

import { ViewTransition } from "react";
import Link from "next/link";
import { GazingAvatar } from "@/components/avatar-gaze";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, ButtonLink, Panel, PlotLabel, Rule } from "@/components/primitives";
import { IconArrowLeft, IconArrowRight } from "@/components/icons";
import { useSession, type ExpressionId } from "@/lib/session";

/**
 * Step one: the face.
 *
 * This is deliberately the lightest screen in the flow. Everything after it
 * asks the visitor to disclose something — what they can and can't do, then a
 * verification, then a consent — and opening on a question with no wrong
 * answer is a better on-ramp than opening on the capability chart.
 *
 * The controls are all overrides on top of a seed rather than a paint palette.
 * Shuffle stays the primary action for that reason: every result is a real
 * blobatar the generator would have produced, so nobody can dial their way to
 * something that doesn't belong on the wall with everyone else.
 */

const EXPRESSIONS: { id: ExpressionId; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "happy", label: "Happy" },
  { id: "sad", label: "Sad" },
  { id: "mad", label: "Mad" },
  { id: "surprised", label: "Surprised" },
];

export default function AvatarPage() {
  const { avatar, setAvatar, shuffleAvatar, hydrated } = useSession();

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

        <div className="mt-14 max-w-[34rem]">
          <PlotLabel>Step 1 of 4</PlotLabel>
          <h1 className="mt-3 display-sm text-[clamp(2rem,4.5vw,3rem)]">
            Meet your blobatar.
          </h1>
          <p className="prose-lg mt-5 text-[var(--text-2)]">
            This is you, everywhere in Aide: on your posts, on the wall, next to
            your profile. Shuffle until one feels right, or tune it. Nothing here
            is a capability question; that comes next.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-14">
          {/* The face */}
          <Panel className="flex flex-col items-center justify-center gap-7 p-8 sm:p-10">
            {/* Paired with the face on /profile by name: on navigation the
                browser keeps this one element and animates it to its new size
                and position, so the thing you just made visibly carries over
                instead of being replaced by a lookalike. */}
            <ViewTransition name="blobatar">
              <GazingAvatar
                seed={avatar.seed}
                size={248}
                hue={avatar.hue}
                tone={avatar.tone}
                expression={avatar.expression}
                travel={6}
              />
            </ViewTransition>

            <Button variant="secondary" onClick={shuffleAvatar} className="h-11">
              Shuffle
            </Button>
          </Panel>

          {/* The controls */}
          <div>
            <PlotLabel>Tune it</PlotLabel>
            <Rule className="mt-3" />

            <div className="mt-7 grid gap-8">
              <Slider
                label="Hue"
                hint={avatar.hue === null ? "from the shuffle" : `${Math.round(avatar.hue)}°`}
                min={0}
                max={360}
                value={avatar.hue ?? 210}
                onChange={(hue) => setAvatar({ hue })}
              />

              <Slider
                label="Tone"
                hint={avatar.tone === null ? "from the shuffle" : avatar.tone.toFixed(2)}
                min={0}
                max={1}
                step={0.01}
                value={avatar.tone ?? 0.5}
                onChange={(tone) => setAvatar({ tone })}
              />

              <fieldset>
                <legend className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-[var(--text-2)]">
                  Expression
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EXPRESSIONS.map((e) => {
                    const active = avatar.expression === e.id;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setAvatar({ expression: e.id })}
                        className={`target rounded-[var(--r-pill)] border px-4 text-[0.875rem] transition-colors ${
                          active
                            ? "border-[var(--brand)] bg-[var(--brand-dim)] text-[var(--text)]"
                            : "border-[var(--line)] text-[var(--text-2)] hover:border-[var(--text-3)]"
                        }`}
                      >
                        {e.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            <Rule className="mt-10" />

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink href="/profile" className="h-12 px-7">
                Continue to your profile
                <IconArrowRight width={18} height={18} />
              </ButtonLink>
              <p className="font-mono text-[0.8125rem] text-[var(--text-3)]">
                {hydrated ? "you can change this later" : " "}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * A labelled range. Native <input type="range"> on purpose — it is already
 * keyboard operable, already announced correctly, and already honours the
 * target-size custom property through the app's own styling.
 */
function Slider({
  label,
  hint,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-[var(--text-2)]">
          {label}
        </span>
        <span className="font-mono text-[0.75rem] tabular-nums text-[var(--text-3)]">{hint}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-[var(--brand)]"
      />
    </label>
  );
}
