"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useSession } from "@/lib/session";
import { IconArrowLeft, IconArrowRight, IconMic } from "./icons";

export interface SpokenItem {
  id: string;
  /** Said first, and shown largest. */
  title: string;
  /** Said after the title. */
  body: string;
  /** Short mono attribution line, shown small. */
  meta?: string;
}

/**
 * The non-visual surface.
 *
 * When the vision axis is at zero the screen is not the channel, so this is not
 * the sighted layout with bigger text — it is a different interface. One item
 * at a time, announced on arrival, advanced with two targets that occupy half
 * the viewport between them, and no chrome competing for a screen reader's
 * attention.
 *
 * It is still fully rendered and correctly structured, because a blind user is
 * very likely running their own screen reader over it and the two must not
 * fight: the item is a live region, the controls are real buttons with real
 * labels, and nothing important is conveyed by position alone.
 */
export function VoiceStage({
  label,
  items,
  emptyLabel,
}: {
  label: string;
  items: SpokenItem[];
  emptyLabel: string;
}) {
  // The stage's own hold bar drives the same gesture the rest of the app binds
  // to press-and-hold, by dispatching the events the voice layer listens for.
  const onHoldStart = useCallback(() => {
    window.dispatchEvent(new CustomEvent("axis:hold-start"));
  }, []);
  const onHoldEnd = useCallback(() => {
    window.dispatchEvent(new CustomEvent("axis:hold-end"));
  }, []);

  const { adaptation } = useSession();
  const reduce = useReducedMotion();
  const animate = !reduce && !adaptation.reduceMotion;

  const [index, setIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const spokenFor = useRef<string | null>(null);

  const item = items[index];

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      /* no synthesis; the live region still announces to a screen reader */
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* nothing playing */
    }
    setSpeaking(false);
  }, []);

  // Announce each item once as it arrives. Not on mount of the same item, so
  // re-renders don't restart the read.
  useEffect(() => {
    if (!item || spokenFor.current === item.id) return;
    spokenFor.current = item.id;
    speak(`${item.title}. ${item.body}`);
  }, [item, speak]);

  useEffect(() => stop, [stop]);

  const go = useCallback(
    (delta: number) => {
      stop();
      setIndex((i) => (i + delta + items.length) % items.length);
    },
    [items.length, stop],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!item) {
    return <p className="text-[1.25rem] leading-[1.5]">{emptyLabel}</p>;
  }

  return (
    <section aria-label={label} className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[0.8125rem] uppercase tracking-[0.14em] text-[var(--text-2)]">
          {label}
        </p>
        <p className="font-mono text-[0.8125rem] tabular-nums text-[var(--text-2)]">
          <span className="text-[var(--brand)]">{index + 1}</span> of {items.length}
        </p>
      </div>

      {/* One item, at the size the whole surface is built around. */}
      <motion.article
        key={item.id}
        initial={animate ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-1 flex-col justify-center py-10"
      >
        <div aria-live="polite" aria-atomic="true">
          {item.meta && (
            <p className="font-mono text-[0.875rem] uppercase tracking-[0.1em] text-[var(--text-2)]">
              {item.meta}
            </p>
          )}
          <h2 className="mt-5 display-sm text-[clamp(2.25rem,5.5vw,3.75rem)] text-balance">
            {item.title}
          </h2>
          <p className="mt-7 text-[clamp(1.125rem,2vw,1.5rem)] leading-[1.55]" style={{ maxWidth: "44ch" }}>
            {item.body}
          </p>
        </div>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => (speaking ? stop() : speak(`${item.title}. ${item.body}`))}
            className="border inline-flex h-16 items-center gap-3 border-[var(--line)] px-6 text-[1.0625rem] font-medium transition-colors hover:border-[var(--text-2)]"
          >
            <IconMic width={22} height={22} />
            {speaking ? "Stop reading" : "Read again"}
          </button>
        </div>
      </motion.article>

      {/* The hold target, full width — the primary way this surface is used. */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          onHoldStart();
        }}
        onPointerUp={onHoldEnd}
        onPointerLeave={onHoldEnd}
        className="mb-3 flex h-24 w-full items-center justify-center gap-4 text-[1.25rem] font-medium transition-opacity active:opacity-90"
        style={{ backgroundColor: "var(--brand)", color: "var(--surface)" }}
      >
        <IconMic width={28} height={28} />
        Hold to talk
      </button>

      {/* The pager. Two targets, nothing to aim at. */}
      <div className="grid grid-cols-2 gap-3 pb-4">
        <button
          type="button"
          onClick={() => go(-1)}
          className="border flex h-24 items-center justify-center gap-3 border-[var(--line)] text-[1.125rem] font-medium transition-colors hover:bg-[color-mix(in_oklab,var(--text)_5%,transparent)]"
        >
          <IconArrowLeft width={24} height={24} />
          Previous
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="border flex h-24 items-center justify-center gap-3 border-[var(--line)] text-[1.125rem] font-medium transition-colors hover:bg-[color-mix(in_oklab,var(--text)_5%,transparent)]"
        >
          Next
          <IconArrowRight width={24} height={24} />
        </button>
      </div>

      <p className="pb-2 font-mono text-[0.8125rem] leading-[1.5] text-[var(--text-2)]">
        Hold anywhere, or hold the space bar, to ask the agent for something.
        Left and right arrow keys move between items.
      </p>
    </section>
  );
}
