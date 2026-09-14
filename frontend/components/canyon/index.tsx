"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session";
import { liveHeroAllowed } from "./gpu-gate";
import { createRiverHero, HERO_TEXT_DELAY_MS, HERO_TEXT_SLIDE_MIN_W } from "./scene";

/**
 * The hero canvas — river.ai's canyon scene.
 *
 * Three gates decide what actually runs, in order:
 *
 *  1. A capability-aware short circuit. Reduced motion, from the OS or from the
 *     profile, resolves one frame and holds it — no loop, no time-of-day cycle.
 *  2. An upfront GPU gate (see gpu-gate.ts) that runs BEFORE the scene shader
 *     is compiled, because compiling it can itself hang a weak GPU.
 *  3. An in-loop AA governor that trades supersampling for frame budget, and
 *     bails to a snapshot still if the device cannot hold ~20fps at the floor.
 *
 * The typewriter is driven from the render loop rather than a React timer, so
 * the text and the scene reveal share one clock. `onType` fires per rendered
 * frame; the caller stores substring lengths, so React only re-renders when a
 * character actually lands.
 */

export type CanyonProps = {
  className?: string;
  /** Drives the typewriter. Also rendered in full for assistive tech. */
  headline?: string;
  subline?: string;
  onType?: (state: { head: number; sub: number; revealed: boolean }) => void;
};

// Budget: the hero should be fully readable inside ~2.8s. The headline is the
// hook, so it stays fractionally more deliberate than the subline, which people
// skim. Anything slower and a first-time visitor is watching a loading bar.
const HEAD_RATE = 24; // ms per character
const HEAD_DELAY = 150;
const SUB_DELAY = 180; // after the headline finishes
const SUB_RATE = 15;

export function Canyon({ className, headline = "", subline = "", onType }: CanyonProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [still, setStill] = useState<string | null>(null);
  // Only true once we know the live scene is NOT going to run. The decorative
  // fallback is a bright radial wash, so showing it while the gate is still
  // deciding put a tan oval on screen for a beat before the canyon replaced it.
  const [showFallback, setShowFallback] = useState(false);
  const { adaptation } = useSession();

  // The loop reads copy and the callback through refs, so neither retunes the
  // GL context or restarts the intro.
  const copy = useRef({ headline, subline, onType });
  useEffect(() => {
    copy.current = { headline, subline, onType };
  }, [headline, subline, onType]);

  const reduceMotion = adaptation.reduceMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let hero: { destroy: () => void } | null = null;

    const osReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reduce = osReduce || reduceMotion;

    // Last emitted counts, so we only call back when a character lands.
    let lastHead = -1;
    let lastSub = -1;
    let lastRevealed = false;

    function emit(elapsed: number, revealed: boolean) {
      const { headline: h, subline: s, onType: cb } = copy.current;
      if (!cb) return;
      // Wide/non-touch types over the condensing valley after a short hold;
      // narrow/touch types first, over the bare sky.
      const slides =
        !window.matchMedia("(pointer: coarse)").matches &&
        window.innerWidth >= HERO_TEXT_SLIDE_MIN_W;
      const el = elapsed - (slides ? HERO_TEXT_DELAY_MS : 0);
      const head = Math.max(0, Math.min(h.length, Math.floor((el - HEAD_DELAY) / HEAD_RATE)));
      const headDoneAt = HEAD_DELAY + h.length * HEAD_RATE + SUB_DELAY;
      const sub =
        el >= headDoneAt
          ? Math.max(0, Math.min(s.length, Math.floor((el - headDoneAt) / SUB_RATE)))
          : 0;
      if (head === lastHead && sub === lastSub && revealed === lastRevealed) return;
      lastHead = head;
      lastSub = sub;
      lastRevealed = revealed;
      cb({ head, sub, revealed });
    }

    // Probe support on a throwaway context so the gate never sees the scene
    // shader — the whole point is to decide before that gets compiled.
    const probe = (canvas.getContext("webgl", { antialias: false, alpha: false }) ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

    if (reduce || !probe) {
      // Reduced motion (or no WebGL): resolve the text immediately, static.
      emit(Number.MAX_SAFE_INTEGER, true);
      if (reduce && probe) {
        hero = createRiverHero(canvas, { reduceMotion: true, onPhase: () => {} });
      } else {
        setShowFallback(true); // no WebGL at all — the wash is the whole hero
      }
      return () => {
        hero?.destroy();
      };
    }

    const params = new URLSearchParams(window.location.search);
    const force = { live: params.has("riverLive"), static: params.has("riverStatic") };

    liveHeroAllowed(probe, force).then((allowed) => {
      if (disposed) return;
      if (!allowed) {
        // Static path: the CSS fallback underneath stays visible and the text
        // still types in, so the hero never reads as broken.
        setShowFallback(true);
        canvas.style.display = "none";
        const t0 = performance.now();
        const tick = () => {
          if (disposed) return;
          const el = performance.now() - t0;
          emit(el, true);
          if (el < 12000) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        return;
      }
      hero = createRiverHero(canvas, {
        reduceMotion: false,
        onPhase: ({ elapsed, revealed }) => emit(elapsed, revealed),
        onFreeze: (url) => setStill(url),
      });
    });

    return () => {
      disposed = true;
      hero?.destroy();
    };
  }, [reduceMotion]);

  return (
    <div className={className} aria-hidden="true">
      {/* Ground under the canvas. Flat night by default, matching the GL clear
          colour exactly so the handover to the first drawn frame is invisible.
          It only becomes the decorative wash once the gate has actually ruled
          the live scene out — that wash is bright, and showing it up front
          flashed a tan oval over the canyon on every load. */}
      <div className={`absolute inset-0 ${showFallback ? "canyon-fallback" : "canyon-ground"}`} />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Snapshot still, swapped in if the scene bails on slow hardware. */}
      {still && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={still} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
}
