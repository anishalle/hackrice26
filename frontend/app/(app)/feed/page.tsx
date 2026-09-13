"use client";

import { useState } from "react";
import Link from "next/link";
import { GazingAvatar } from "@/components/avatar-gaze";
import { Avatar } from "@/components/avatar";
import { useSession } from "@/lib/session";
import { HOME_FILTERS, SKILL_NOTES, CATEGORY_TONE } from "@/lib/skills";
import {
  CATEGORY_ICONS,
  IconArrowRight,
  IconMotor,
  IconShield,
  IconSpeech,
  IconWall,
} from "@/components/icons";

/**
 * Home: the check-in, the four things the app is for, and what other people's
 * skills actually did for them.
 *
 * Translated from the phone app's home screen. The order is the argument: the
 * check-in comes first because it is the one thing the app asks of you, the
 * category tiles are the shortcut for people who arrived knowing what they
 * wanted, and the skill notes are last because they are browsing rather than
 * doing.
 */

const TILES = [
  { key: "Speech", label: "Speech", Icon: IconSpeech, tone: "amber" },
  { key: "Mobility", label: "Mobility", Icon: IconMotor, tone: "mint" },
  { key: "Daily", label: "Daily", Icon: IconWall, tone: "periwinkle" },
  { key: "Care", label: "Care", Icon: IconShield, tone: "peach" },
] as const;

export default function HomePage() {
  const { patient } = useSession();
  const [filter, setFilter] = useState<string>("All");
  const first = patient.name.split(" ")[0];

  const notes =
    filter === "All" ? SKILL_NOTES : SKILL_NOTES.filter((n) => n.tag === filter);

  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-light leading-tight tracking-[-0.02em]">
            Hi, {first}
          </h1>
          <p className="mt-1 text-[1rem] text-[var(--text-2)]">How can I help?</p>
        </div>
        <Link
          href="/agent"
          aria-label="Open the agent"
          className="btn-lift target inline-flex items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--surface)", width: 48, height: 48 }}
        >
          <Avatar
            seed={patient.avatar.seed}
            hue={patient.avatar.hue}
            tone={patient.avatar.tone}
            expression={patient.avatar.expression}
            size={28}
          />
        </Link>
      </header>

      {/* The check-in. The one thing the app asks for, so it gets the largest
          surface on the screen and the only filled button above the fold. */}
      <section className="axl-card mt-7 flex items-center gap-4 p-5">
        <GazingAvatar
          seed={patient.avatar.seed}
          hue={patient.avatar.hue}
          tone={patient.avatar.tone}
          expression={patient.avatar.expression}
          size={96}
          travel={6}
          className="block shrink-0"
        />
        <div className="min-w-0">
          <h2 className="text-[1.125rem] font-semibold leading-snug tracking-[-0.01em]">
            Your weekly check-in takes two minutes
          </h2>
          <Link
            href="/agent"
            className="btn-lift target mt-4 inline-flex items-center gap-2 rounded-[var(--r-pill)] px-6 text-[1.0625rem] font-semibold"
            style={{ backgroundColor: "var(--signal-mint)", color: "var(--text)" }}
          >
            Check in
            <IconArrowRight width={18} height={18} />
          </Link>
        </div>
      </section>

      <div className="mt-5 -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
        {TILES.map(({ key, label, Icon, tone }) => (
          <Link
            key={key}
            href="/marketplace"
            className="axl-tile btn-lift flex shrink-0 flex-col justify-between p-5"
            style={{ width: 150, height: 150 }}
          >
            <span
              aria-hidden
              className="inline-flex items-center justify-center rounded-full"
              style={{ backgroundColor: `var(--signal-${tone})`, width: 40, height: 40 }}
            >
              <Icon width={20} height={20} />
            </span>
            <span className="text-[1.375rem] font-light tracking-[-0.02em]">{label}</span>
          </Link>
        ))}
      </div>

      <section className="mt-9">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[1.125rem] font-semibold tracking-[-0.01em]">
            Skills others built
          </h2>
          <Link href="/marketplace" className="text-[0.9375rem] text-[var(--text-2)]">
            View all
          </Link>
        </div>

        <div className="mt-4 -mx-5 flex gap-2 overflow-x-auto px-5 pb-2">
          {HOME_FILTERS.map((f) => {
            const on = f === filter;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f)}
                className="btn-lift target shrink-0 rounded-[var(--r-pill)] px-5 text-[0.9375rem] font-medium"
                style={{
                  backgroundColor: on ? "var(--signal-mint)" : "var(--surface)",
                  color: "var(--text)",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        <ul className="mt-4 grid gap-3">
          {notes.map((n) => {
            const Glyph = CATEGORY_ICONS[n.tag];
            return (
            <li key={n.id}>
              <Link
                href="/marketplace"
                className="axl-tile btn-lift flex items-center gap-3.5 p-4"
              >
                <span
                  aria-hidden
                  className="inline-flex shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `var(--signal-${CATEGORY_TONE[n.tag]})`,
                    width: 36,
                    height: 36,
                  }}
                >
                  <Glyph width={17} height={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[1.0625rem] font-semibold tracking-[-0.01em]">
                    {n.title}
                  </span>
                  <span className="mt-0.5 block text-[0.9375rem] leading-snug text-[var(--text-2)]">
                    {n.note}
                  </span>
                </span>
                <IconArrowRight
                  width={18}
                  height={18}
                  className="shrink-0 text-[var(--text-3)]"
                />
              </Link>
            </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
