"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AXIS_SPECS, type Axis, type Level } from "@/lib/capability";
import { AXIS_ICONS } from "./icons";
import { PlotLabel } from "./ui";

/**
 * One axis of the profile, drawn as a plot track.
 *
 * The interaction is a radiogroup, not a slider: each stop is a discrete,
 * nameable state, and a slider would force a person using a switch to traverse
 * every value to reach the one they want. Arrow keys move between stops; the
 * mark animates to the chosen one and the caller draws the consequence.
 */
export function AxisPlot({
  axis,
  value,
  onChange,
  disabled,
}: {
  axis: Axis;
  value: Level;
  onChange: (level: Level) => void;
  disabled?: boolean;
}) {
  const spec = AXIS_SPECS[axis];
  const AxisIcon = AXIS_ICONS[axis];
  const groupId = useId();
  const reduce = useReducedMotion();

  // Stops are stored 0 (most support) → 3 (least) but read left-to-right as
  // "full" on the left, matching a clinical chart where the baseline sits left.
  const ordered = [...spec.stops].sort((a, b) => b.level - a.level);
  const index = ordered.findIndex((s) => s.level === value);
  const current = ordered[index];

  function move(delta: number) {
    const next = ordered[Math.min(ordered.length - 1, Math.max(0, index + delta))];
    if (next) onChange(next.level);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[11rem_1fr] sm:gap-6">
      <div className="flex items-start gap-2.5 pt-0.5">
        <AxisIcon className="mt-px shrink-0 text-[var(--ink-2)]" width={18} height={18} />
        <div className="min-w-0">
          <h3 className="text-[0.9375rem] font-medium leading-tight">
            {spec.title}{" "}
            <span className="font-mono text-[0.75rem] font-normal text-[var(--ink-2)]">{spec.unit}</span>
          </h3>
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-[var(--ink-2)]">{spec.question}</p>
        </div>
      </div>

      <div>
        <div
          role="radiogroup"
          aria-labelledby={groupId}
          aria-describedby={`${groupId}-value`}
          className="relative"
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              move(1);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              move(-1);
            } else if (e.key === "Home") {
              e.preventDefault();
              onChange(ordered[0].level);
            } else if (e.key === "End") {
              e.preventDefault();
              onChange(ordered[ordered.length - 1].level);
            }
          }}
        >
          <span id={groupId} className="sr-only">
            {spec.title}: {spec.question}
          </span>

          {/* The axis rule with its tick marks. */}
          <div className="relative h-[var(--target)]">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2"
              style={{ backgroundColor: "var(--rule-major)" }}
            />

            <div
              className="relative grid h-full"
              style={{ gridTemplateColumns: `repeat(${ordered.length}, 1fr)` }}
            >
              {ordered.map((stop) => {
                const selected = stop.level === value;
                return (
                  <button
                    key={stop.level}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected ? 0 : -1}
                    disabled={disabled}
                    onClick={() => onChange(stop.level)}
                    title={stop.label}
                    className="group relative flex h-full items-center justify-center disabled:pointer-events-none"
                  >
                    <span className="sr-only">{stop.label}</span>
                    <span
                      aria-hidden
                      className="h-3 w-px transition-colors duration-150"
                      style={{
                        backgroundColor: selected ? "transparent" : "var(--rule-major)",
                      }}
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      style={{ backgroundColor: "color-mix(in oklab, var(--plot) 7%, transparent)" }}
                    />
                  </button>
                );
              })}

              {/* The mark. It slides; everything else holds still. */}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full"
                style={{
                  backgroundColor: "var(--plot)",
                  left: `calc(${(index + 0.5) * (100 / ordered.length)}% - 0.4375rem)`,
                }}
                animate={{ left: `calc(${(index + 0.5) * (100 / ordered.length)}% - 0.4375rem)` }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 520, damping: 34, mass: 0.7 }
                }
              />
            </div>
          </div>

          {/* Scale legend: the two poles, mono, on the axis. */}
          <div className="mt-1 flex items-baseline justify-between">
            <PlotLabel>{ordered[0].code}</PlotLabel>
            <PlotLabel>{ordered[ordered.length - 1].code}</PlotLabel>
          </div>
        </div>

        <p id={`${groupId}-value`} aria-live="polite" className="mt-2 text-[0.875rem] leading-snug">
          {current?.label}
        </p>
      </div>
    </div>
  );
}
