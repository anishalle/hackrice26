"use client";

import { useSession } from "@/lib/session";
import { IconMoon, IconSun } from "./icons";

export function ThemeToggle() {
  const { theme, toggleTheme, hydrated } = useSession();
  const dark = hydrated && theme === "dark";
  // The glyph and the word next to it both name the theme you are currently in,
  // not the one the button switches to. Pairing a sun with the word "Dark" was
  // the bug: two halves of the same control disagreeing about what they mean.
  // Before hydration neither is known, so it falls back to the sun and "Theme".
  const Glyph = dark ? IconMoon : IconSun;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={hydrated ? `Switch to ${theme === "light" ? "dark" : "light"} theme` : "Switch theme"}
      className="btn-lift target inline-flex items-center gap-2 px-2 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-[var(--text-2)] hover:text-[var(--text)] sm:px-3"
    >
      <Glyph width={16} height={16} />
      <span className="hidden sm:inline">{hydrated ? (theme === "light" ? "Light" : "Dark") : "Theme"}</span>
    </button>
  );
}
