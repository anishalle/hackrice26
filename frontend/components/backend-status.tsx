"use client";

import { useEffect, useState } from "react";
import { API_BASE, isBackendUp } from "@/lib/api";

/**
 * A quiet indicator of whether the FastAPI backend is reachable.
 *
 * Worth having visible during a demo: a dead backend and a backend that simply
 * has no data yet look identical from the UI otherwise, and the CORS origin
 * mismatch between :3000 and the backend's :5173 default is exactly the kind
 * of thing that gets discovered on stage.
 */
export function BackendStatus() {
  const [state, setState] = useState<"checking" | "up" | "down">("checking");

  useEffect(() => {
    let cancelled = false;
    isBackendUp().then((up) => {
      if (!cancelled) setState(up ? "up" : "down");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    state === "checking" ? "Checking API" : state === "up" ? "API connected" : "API offline";
  const color =
    state === "up" ? "var(--accent)" : state === "down" ? "var(--text-3)" : "var(--text-3)";

  return (
    <span
      className="inline-flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em]"
      style={{ color }}
      title={state === "down" ? `No response from ${API_BASE}` : API_BASE}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
