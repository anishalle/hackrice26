"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const BASE =
  "target inline-flex items-center justify-center gap-2 rounded-[var(--r-pill)] px-6 " +
  "text-[0.9375rem] font-medium transition-[background-color,color,border-color,opacity] " +
  "duration-150 disabled:opacity-45 disabled:pointer-events-none";

// The primary is the maximum-contrast pill — near-black on light, near-white
// on dark. Cornflower is reserved for the accent role, which keeps it meaning
// something instead of becoming the colour of every button on the page.
const VARIANTS = {
  primary: "bg-[var(--solid)] text-[var(--solid-ink)] hover:opacity-90",
  brand: "bg-[var(--brand)] text-[var(--brand-ink)] hover:bg-[var(--brand-hover)]",
  secondary:
    "border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--text-3)]",
  quiet: "text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
} as const;

type Variant = keyof typeof VARIANTS;

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cx(BASE, VARIANTS[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(BASE, VARIANTS[variant], className)} {...props} />;
}

export function Panel({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div" | "aside";
}) {
  return <As className={cx("card", className)}>{children}</As>;
}

export function PlotLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("eyebrow", className)}>{children}</span>;
}

/**
 * The app's explanatory voice: a short mono note with a leader bar, used
 * wherever the product needs to say why it just did something.
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
  const color =
    tone === "attest" ? "var(--accent)" : tone === "plot" ? "var(--brand-soft)" : "var(--text-3)";
  return (
    <p className={cx("flex gap-2.5 font-mono text-[0.75rem] leading-[1.55]", className)} style={{ color }}>
      <span aria-hidden className="mt-[0.5em] h-px w-3.5 shrink-0" style={{ backgroundColor: color }} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function Rule({ major = false, className }: { major?: boolean; className?: string }) {
  return (
    <hr
      className={cx("h-px border-0", className)}
      style={{ backgroundColor: major ? "var(--line)" : "var(--line-soft)" }}
    />
  );
}

export function SimulatedBadge({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--text-3)]">
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: "var(--warn)" }}
      />
      {children}
    </p>
  );
}
