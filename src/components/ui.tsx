"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* -------------------------------------------------------------------------- */

const BUTTON_BASE =
  "target inline-flex items-center justify-center gap-2 px-5 text-[0.9375rem] font-medium " +
  "transition-[background-color,color,border-color,box-shadow] duration-150 " +
  "disabled:opacity-45 disabled:pointer-events-none";

const VARIANTS = {
  primary: "bg-[var(--plot)] text-[var(--paper-raised)] hover:bg-[color-mix(in_oklab,var(--plot)_88%,black)]",
  secondary: "hairline border-[var(--rule-major)] bg-[var(--paper-raised)] text-[var(--ink)] hover:border-[var(--ink-2)]",
  quiet: "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]",
} as const;

type Variant = keyof typeof VARIANTS;

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cx(BUTTON_BASE, VARIANTS[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(BUTTON_BASE, VARIANTS[variant], className)} {...props} />;
}

/* -------------------------------------------------------------------------- */

/**
 * A plotted region. Elevation is declared once — a hairline rule, never a rule
 * plus a shadow.
 */
export function Panel({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div" | "aside";
}) {
  return (
    <As className={cx("hairline border-[var(--rule-major)] bg-[var(--paper-raised)]", className)}>
      {children}
    </As>
  );
}

/**
 * The chart's own caption style: a mono label sitting on the axis rule.
 */
export function PlotLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--ink-2)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A margin annotation — the hairline leader plus its note. This is how the app
 * explains itself, and it replaces the tooltip nearly everywhere.
 */
export function Annotation({
  children,
  tone = "route",
  className,
}: {
  children: ReactNode;
  tone?: "route" | "attest" | "plot";
  className?: string;
}) {
  const color = tone === "attest" ? "var(--attest)" : tone === "plot" ? "var(--plot)" : "var(--route)";
  return (
    <p
      className={cx("flex gap-2.5 font-mono text-[0.75rem] leading-[1.5]", className)}
      style={{ color }}
    >
      <span aria-hidden className="mt-[0.55em] h-px w-4 shrink-0" style={{ backgroundColor: color }} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function Rule({ major = false, className }: { major?: boolean; className?: string }) {
  return (
    <hr
      className={cx("border-0 h-px", className)}
      style={{ backgroundColor: major ? "var(--rule-major)" : "var(--rule)" }}
    />
  );
}

/** The fictional-provider / simulated-data banner. Never suppressed. */
export function SimulatedBadge({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--ink-2)]">
      <span
        aria-hidden
        className="mr-2 inline-block h-1.5 w-1.5 align-middle"
        style={{ backgroundColor: "var(--route)" }}
      />
      {children}
    </p>
  );
}
