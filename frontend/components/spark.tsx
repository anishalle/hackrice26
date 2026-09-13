"use client";

import { useId } from "react";
import { delta, type Series } from "@/lib/records";

/**
 * A single instrument's history, drawn small.
 *
 * Deliberately not a charting library. These are one series, no axes, no
 * interaction, and the whole point is that a clinician can read six of them in
 * a column without any one of them asking for attention. A library would bring
 * a tooltip layer, a legend and a hover state that all have to be made
 * keyboard-reachable before the screen is honest, for a shape that is nine
 * lines of path arithmetic.
 *
 * The numbers are duplicated in text beside the chart rather than only inside
 * it. That is not redundancy: a line whose value is only legible as a pixel
 * height is unreadable to anyone using this app through a screen reader, and
 * this is a product about exactly that. The chart is `aria-hidden` and the
 * sentence next to it is the real content.
 */
export function Sparkline({ series, width = 240, height = 48 }: {
  series: Series;
  width?: number;
  height?: number;
}) {
  const gradientId = useId();
  const { points } = series;

  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  // A flat series would divide by zero; give it a band so it draws mid-height.
  const span = max - min || 1;
  const pad = 4;
  const innerH = height - pad * 2;

  const x = (i: number) => (i / (points.length - 1)) * width;
  const y = (v: number) => pad + innerH - ((v - min) / span) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(p).toFixed(2)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const stroke = `var(--signal-${series.tone})`;

  const lastX = x(points.length - 1);
  const lastY = y(points[points.length - 1]);

  return (
    <svg
      aria-hidden
      focusable="false"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block w-full overflow-visible"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={2.75} fill={stroke} />
    </svg>
  );
}

/**
 * A series as a row: name, latest reading, movement, chart, and what it means.
 *
 * The chart is the least important part of this and is sized accordingly.
 */
export function SeriesRow({ series }: { series: Series }) {
  const d = delta(series);
  const last = series.points[series.points.length - 1];
  const first = series.points[0];

  return (
    <div className="grid gap-3 py-5 sm:grid-cols-[13rem_1fr] sm:gap-6">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[0.9375rem] font-medium leading-tight">{series.label}</h3>
        </div>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="font-mono text-[1.125rem] tabular-nums leading-none">{last}</span>
          <span className="font-mono text-[0.75rem] text-[var(--text-3)]">{series.unit}</span>
        </p>
        <p
          className="mt-1.5 font-mono text-[0.75rem]"
          style={{ color: d.improving ? "var(--text-2)" : "var(--brand)" }}
        >
          {d.text} since W1
        </p>
      </div>

      <div className="min-w-0">
        {/* The sentence, not the picture, is the content. It carries the same
            numbers the line does so nothing is only available visually. */}
        <p className="sr-only">
          {series.label}: {first} {series.unit} at week one, {last} {series.unit} now,
          a change of {d.text}. {series.reading}
        </p>
        <Sparkline series={series} />
        <p className="mt-2 max-w-[62ch] text-[0.8125rem] leading-[1.55] text-[var(--text-2)]">
          {series.reading}
        </p>
      </div>
    </div>
  );
}

/** One domain of a functional score, as a filled track. */
export function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = (score / max) * 100;
  return (
    <div className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3">
      <span className="truncate text-[0.8125rem] text-[var(--text-2)]">{label}</span>
      <span
        role="img"
        aria-label={`${label}: ${score} of ${max}`}
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--line)" }}
      >
        <span
          aria-hidden
          className="block h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: pct <= 50 ? "var(--signal-peach)" : "var(--signal-mint)",
          }}
        />
      </span>
      <span className="text-right font-mono text-[0.75rem] tabular-nums text-[var(--text-3)]">
        {score}/{max}
      </span>
    </div>
  );
}
