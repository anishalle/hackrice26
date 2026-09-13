"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSession } from "@/lib/session";
import { SAMPLE_EXCHANGE } from "@/lib/fixtures";
import { IconMic } from "./icons";

/**
 * Press-and-hold to talk.
 *
 * The brief is "hold and tap anywhere on the screen". On a desktop target that
 * cannot be the whole story, so this binds three things to the same gesture:
 * pointer-hold on any non-interactive part of the page, hold-Space from the
 * keyboard, and an always-present explicit button for anyone whose input device
 * does neither. All three drive one state machine.
 *
 * Speech synthesis is real where the browser provides it. Recognition is
 * simulated — the Web Speech recognition API is Chromium-only and needs a live
 * mic grant, which is not something a demo should depend on. The simulation is
 * labelled on screen rather than passed off as real.
 */

type Phase = "idle" | "listening" | "thinking" | "answering";

const HOLD_THRESHOLD_MS = 220;

export function VoiceLayer() {
  const { adaptation } = useSession();
  const reduce = useReducedMotion();
  const animate = !reduce && !adaptation.reduceMotion;

  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");

  const holdTimer = useRef<number | null>(null);
  const typeTimer = useRef<number | null>(null);
  const active = useRef(false);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      window.speechSynthesis.speak(utterance);
    } catch {
      /* synthesis unavailable; the transcript on screen carries the answer */
    }
  }, []);

  const stopAll = useCallback(() => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    if (typeTimer.current) window.clearInterval(typeTimer.current);
    holdTimer.current = null;
    typeTimer.current = null;
  }, []);

  const begin = useCallback(() => {
    if (active.current) return;
    active.current = true;
    setPhase("listening");
    setHeard("");
    setReply("");

    // Transcribe the sample utterance progressively so the surface has
    // something live to show while the user is holding.
    const words = SAMPLE_EXCHANGE[0].text.split(" ");
    let i = 0;
    typeTimer.current = window.setInterval(() => {
      i += 1;
      setHeard(words.slice(0, i).join(" "));
      if (i >= words.length && typeTimer.current) {
        window.clearInterval(typeTimer.current);
        typeTimer.current = null;
      }
    }, 90);
  }, []);

  const release = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    stopAll();
    setHeard(SAMPLE_EXCHANGE[0].text);
    setPhase("thinking");

    window.setTimeout(() => {
      const answer = SAMPLE_EXCHANGE[1].text;
      setReply(answer);
      setPhase("answering");
      speak(answer);
    }, 620);
  }, [speak, stopAll]);

  const dismiss = useCallback(() => {
    active.current = false;
    stopAll();
    setPhase("idle");
    setHeard("");
    setReply("");
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* nothing to cancel */
      }
    }
  }, [stopAll]);

  // Hold-anywhere. Interactive elements keep their own behaviour.
  useEffect(() => {
    function isInteractive(el: EventTarget | null): boolean {
      return (
        el instanceof Element &&
        !!el.closest("button, a, input, textarea, select, label, [role='radio'], [role='button']")
      );
    }

    function onPointerDown(e: PointerEvent) {
      if (isInteractive(e.target) || phase !== "idle") return;
      holdTimer.current = window.setTimeout(begin, HOLD_THRESHOLD_MS);
    }
    function onPointerUp() {
      if (holdTimer.current) {
        window.clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }
      if (active.current) release();
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [begin, release, phase]);

  // Hold-Space, the keyboard equivalent of hold-anywhere.
  useEffect(() => {
    function typing(el: EventTarget | null) {
      return el instanceof Element && !!el.closest("input, textarea, [contenteditable='true']");
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") return dismiss();
      if (e.code !== "Space" || e.repeat || typing(e.target)) return;
      if (phase !== "idle" && phase !== "listening") return;
      e.preventDefault();
      begin();
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== "Space" || typing(e.target)) return;
      e.preventDefault();
      release();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [begin, release, dismiss, phase]);

  // The voice-first stage renders its own hold bar; it drives this same
  // state machine rather than duplicating it.
  useEffect(() => {
    const start = () => begin();
    const end = () => release();
    window.addEventListener("axis:hold-start", start);
    window.addEventListener("axis:hold-end", end);
    return () => {
      window.removeEventListener("axis:hold-start", start);
      window.removeEventListener("axis:hold-end", end);
    };
  }, [begin, release]);

  useEffect(() => stopAll, [stopAll]);

  const open = phase !== "idle";

  return (
    <>
      {/* The explicit control. Hidden only where the stage renders its own,
          never removed outright. */}
      {!adaptation.voiceFirst && (
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          begin();
        }}
        onPointerUp={release}
        onPointerLeave={() => active.current && release()}
        aria-label="Hold to talk to the agent"
        /* bottom-28 clears the floating tab bar, which is centred at the foot of
           every app screen. At bottom-6 the two overlapped and the hold-to-talk
           button covered a whole tab. */
        className="fixed bottom-28 right-6 z-40 flex h-14 items-center gap-3 px-5 text-[0.9375rem] font-medium shadow-[0_2px_16px_-4px_rgba(0,0,0,0.25)] transition-transform duration-150 active:scale-[0.97]"
        style={{ backgroundColor: "var(--brand)", color: "var(--surface)", borderRadius: 999 }}
      >
        <IconMic width={20} height={20} />
        Hold to talk
      </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
            style={{ backgroundColor: "color-mix(in oklab, var(--bg) 82%, transparent)" }}
            onClick={phase === "answering" ? dismiss : undefined}
          >
            <motion.div
              initial={animate ? { y: 14, opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }}
              exit={animate ? { y: 10, opacity: 0 } : { opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="border w-full max-w-[42rem] border-[var(--line)] p-7 sm:p-9"
              style={{ backgroundColor: "var(--surface)" }}
              role="dialog"
              aria-modal="true"
              aria-label="Talking to the agent"
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--text-2)]">
                  {phase === "listening" && "Listening"}
                  {phase === "thinking" && "Working"}
                  {phase === "answering" && "Answer"}
                </p>
                {phase === "listening" && <Waveform animate={animate} />}
              </div>

              <p
                aria-live="polite"
                className="mt-5 display-sm text-[clamp(1.5rem,3.5vw,2.125rem)]"
              >
                {heard || <span className="text-[var(--text-2)]">…</span>}
              </p>

              {reply && (
                <motion.div
                  initial={animate ? { opacity: 0, y: 6 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-7"
                >
                  <div className="h-px w-full" style={{ backgroundColor: "var(--line-soft)" }} />
                  <p
                    aria-live="polite"
                    className="mt-5 text-[1.0625rem] leading-[1.6] text-[var(--text)]"
                    style={{ maxWidth: "68ch" }}
                  >
                    {reply}
                  </p>
                  <p className="mt-6 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--text-2)]">
                    Press Escape to close &middot; simulated transcription
                  </p>
                </motion.div>
              )}

              {phase === "listening" && (
                <p className="mt-6 font-mono text-[0.75rem] text-[var(--text-2)]">
                  Let go when you&rsquo;re done.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Waveform({ animate }: { animate: boolean }) {
  const bars = [0, 1, 2, 3, 4, 5, 6];
  return (
    <div aria-hidden className="flex items-center gap-[3px]">
      {bars.map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full"
          style={{ backgroundColor: "var(--brand)" }}
          initial={{ height: 6 }}
          animate={animate ? { height: [6, 18, 9, 22, 6] } : { height: 12 }}
          transition={
            animate
              ? { duration: 1.1, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }
              : { duration: 0 }
          }
        />
      ))}
    </div>
  );
}
