"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Blobatar } from "@blobatar/react";
import { useGaze } from "@blobatar/react/gaze";
import { useSession, type ExpressionId } from "@/lib/session";
import { EXPRESSIONS, type AvatarProps } from "./avatar";
import "blobatar/motion.css";
import "blobatar/gaze.css";

/**
 * A blobatar whose eyes follow the pointer.
 *
 * Deliberately a separate component from [[Avatar]] rather than a `gaze` prop
 * on it. `useGaze` builds a live pointer driver per instance, and the wall
 * renders 143 faces — a prop would hand every one of them a driver it never
 * uses. The library splits `@blobatar/react/gaze` onto its own subpath for
 * exactly this reason, and the split is only worth anything if callers keep it.
 *
 * So: this is for the one or two faces on a screen that are meant to feel like
 * they are looking at you. Everything in a list stays on [[Avatar]].
 *
 * `travel` is the excursion in pixels and is also what opts a blobatar into
 * tracking at all — leaving it out renders a face that looks perfect and never
 * moves, which is the trap the library's own docs warn about.
 */
export function GazingAvatar({
  seed,
  size = 72,
  label,
  hue,
  tone,
  expression,
  travel = 3,
  className,
}: AvatarProps & { travel?: number }) {
  const { adaptation } = useSession();
  const still = adaptation.reduceMotion;
  // Declaring the target here rather than only aiming from the click handler
  // below is the difference between eyes that follow the cursor from the moment
  // the page loads and eyes that sit dead until you happen to click once. The
  // driver is armed by mounting but aimed by asking, and nothing was asking.
  const { ref, lookAt } = useGaze({ travel, lookAt: still ? null : "pointer" });

  // A brief expression that overrides the chosen one, then releases. Held in
  // a ref as well as state so an unmount mid-flash cannot fire setState on a
  // dead component, and so rapid pokes restart the timer rather than stacking.
  const [flash, setFlash] = useState<ExpressionId | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearFlash = useCallback(() => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = null;
  }, []);
  useEffect(() => clearFlash, [clearFlash]);

  const poke = useCallback(() => {
    if (still) return;
    clearFlash();
    setFlash("surprised");
    flashTimer.current = setTimeout(() => setFlash(null), 900);
  }, [still, clearFlash]);

  // A click anywhere on the page pulls his attention to the spot and startles
  // him, then hands him back to the cursor. Both halves are deliberately
  // page-wide: the startle used to be an onPointerDown on the face itself, so
  // he only noticed clicks that landed on him. Pointer events rather than mouse
  // so a tap does the same thing, and passive because this never needs to
  // preventDefault.
  useEffect(() => {
    if (still) return;
    const glance = (e: PointerEvent) => {
      lookAt({ x: e.clientX, y: e.clientY });
      poke();
    };
    const release = () => lookAt("pointer");
    window.addEventListener("pointerdown", glance, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", glance);
      window.removeEventListener("pointerup", release);
    };
  }, [still, lookAt, poke]);

  const active = flash ?? expression;
  const shared = {
    name: seed,
    size,
    background: false as const,
    title: label,
    hue: hue ?? undefined,
    tone: tone ?? undefined,
    expression: active ? EXPRESSIONS[active] : undefined,
    className,
  };

  // Eyes chasing the cursor is exactly the kind of incidental movement the
  // reduced-motion axis is asking us to drop, so the driver is left detached
  // and the face renders still. The profile that asks for calm gets calm.
  if (still) return <Blobatar {...shared} animate="hover" />;

  return <Blobatar ref={ref} {...shared} animate="always" />;
}
