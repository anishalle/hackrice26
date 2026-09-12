"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_PROFILE, type Attestation, type Axis, type Level, type Profile } from "./capability";
import { deriveAdaptation, type Adaptation } from "./adaptation";
import type { ModalityId } from "./verification";

const STORAGE_KEY = "axis.session.v1";

export interface SessionState {
  profile: Profile;
  profileComplete: boolean;
  verifiedWith: ModalityId | null;
  attestation: Attestation | null;
  theme: "dark" | "light";
  /** False until the stored session has been read, so SSR and client agree. */
  hydrated: boolean;
}

const INITIAL: SessionState = {
  profile: { ...DEFAULT_PROFILE },
  profileComplete: false,
  verifiedWith: null,
  attestation: null,
  theme: "dark",
  hydrated: false,
};

/* -------------------------------------------------------------------------- */
/* An external store rather than component state: the session outlives any one
/* tree, and reading localStorage becomes a subscription rather than an effect
/* that sets state during render.                                             */
/* -------------------------------------------------------------------------- */

let state: SessionState = INITIAL;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return INITIAL;
}

function update(patch: (s: SessionState) => SessionState) {
  state = patch(state);
  try {
    const persisted = { ...state, hydrated: undefined };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    /* storage unavailable; the session stays in memory for this tab */
  }
  emit();
}

function hydrate() {
  if (state.hydrated) return;
  let restored: Partial<SessionState> = {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) restored = JSON.parse(raw) as Partial<SessionState>;
  } catch {
    /* a blocked or corrupt store just means a fresh session */
  }
  state = { ...INITIAL, ...restored, hydrated: true };
  emit();
}

/* -------------------------------------------------------------------------- */

export interface Session extends SessionState {
  adaptation: Adaptation;
  setAxis: (axis: Axis, level: Level) => void;
  setProfileComplete: (v: boolean) => void;
  setVerifiedWith: (m: ModalityId | null) => void;
  setAttestation: (a: Attestation | null) => void;
  toggleTheme: () => void;
  reset: () => void;
}

/** Kept so the tree has one obvious mount point for hydration and theming. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { adaptation, theme, hydrated } = useSession();

  useEffect(hydrate, []);

  // The adaptation drives document-level state, not just component props, so
  // every surface inherits it without threading props through the tree.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.contrast = adaptation.maxContrast ? "max" : "normal";
    root.dataset.density = adaptation.density;
    root.dataset.motion = adaptation.reduceMotion ? "reduced" : "full";
    root.style.setProperty("--type-scale", String(adaptation.typeScale));
    root.style.setProperty("--target", `${adaptation.targetSize}px`);
  }, [adaptation, theme, hydrated]);

  return <>{children}</>;
}

export function useSession(): Session {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setAxis = useCallback((axis: Axis, level: Level) => {
    update((s) => ({ ...s, profile: { ...s.profile, [axis]: level } }));
  }, []);

  const setProfileComplete = useCallback((v: boolean) => {
    update((s) => ({ ...s, profileComplete: v }));
  }, []);

  const setVerifiedWith = useCallback((m: ModalityId | null) => {
    update((s) => ({ ...s, verifiedWith: m }));
  }, []);

  const setAttestation = useCallback((a: Attestation | null) => {
    update((s) => ({ ...s, attestation: a }));
  }, []);

  const toggleTheme = useCallback(() => {
    update((s) => ({ ...s, theme: s.theme === "light" ? "dark" : "light" }));
  }, []);

  const reset = useCallback(() => {
    update(() => ({ ...INITIAL, profile: { ...DEFAULT_PROFILE }, hydrated: true }));
  }, []);

  const adaptation = useMemo(() => deriveAdaptation(snapshot.profile), [snapshot.profile]);

  return {
    ...snapshot,
    adaptation,
    setAxis,
    setProfileComplete,
    setVerifiedWith,
    setAttestation,
    toggleTheme,
    reset,
  };
}
