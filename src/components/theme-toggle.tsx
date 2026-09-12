"use client";

import { useSession } from "@/lib/session";
import { IconTheme } from "./icons";

export function ThemeToggle() {
  const { theme, toggleTheme, hydrated } = useSession();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={hydrated ? `Switch to ${theme === "light" ? "dark" : "light"} theme` : "Switch theme"}
      className="target inline-flex items-center gap-2 px-2 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-[var(--ink-2)] transition-colors hover:text-[var(--ink)] sm:px-3"
    >
      <IconTheme width={16} height={16} />
      <span className="hidden sm:inline">{hydrated ? (theme === "light" ? "Light" : "Dark") : "Theme"}</span>
    </button>
  );
}
