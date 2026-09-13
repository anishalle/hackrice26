"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_PROFILE, type Attestation, type Axis, type Level, type Profile } from "./capability";
import { deriveAdaptation, type Adaptation } from "./adaptation";
import type { ModalityId } from "./verification";

const STORAGE_KEY = "axis.session.v1";

/**
 * The chosen blobatar.
 *
 * `seed` is the only required part — shape and base colour both fall out of it,
 * so a seed on its own is already a complete face. `hue`, `tone` and
 * `expression` are overrides layered on top, and each is nullable so that
 * "untouched" stays distinguishable from "deliberately set to the value the
 * seed would have picked anyway". Shuffling clears them.
 */
export interface AvatarChoice {
  seed: string;
  hue: number | null;
  tone: number | null;
  expression: ExpressionId;
}

export type ExpressionId = "idle" | "happy" | "sad" | "mad" | "surprised";

export interface SessionState {
  profile: Profile;
  profileComplete: boolean;
  avatar: AvatarChoice;
  avatarChosen: boolean;
  verifiedWith: ModalityId | null;
  attestation: Attestation | null;
  theme: "light" | "dark";
  /** False until the stored session has been read, so SSR and client agree. */
  hydrated: boolean;
}

/* A fixed seed, not a random one: the server and the first client render have
   to agree, and Math.random() here would mean a different face on each and a
   hydration mismatch. The customiser reseeds on a real interaction instead. */
export const DEFAULT_AVATAR: AvatarChoice = {
  seed: "axis-guest",
  hue: null,
  tone: null,
  expression: "idle",
};

const INITIAL: SessionState = {
  profile: { ...DEFAULT_PROFILE },
  profileComplete: false,
  avatar: { ...DEFAULT_AVATAR },
  avatarChosen: false,
  verifiedWith: null,
  attestation: null,
  theme: "light",
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
  // The avatar is merged a level deeper than the rest. Sessions stored before
  // it existed have no `avatar` key at all, and a spread alone would leave
  // `state.avatar` whole only by luck — a partial one written by an older build
  // would land here missing fields and every read would have to guard.
  state = {
    ...INITIAL,
    ...restored,
    avatar: { ...DEFAULT_AVATAR, ...(restored.avatar ?? {}) },
    hydrated: true,
  };
  emit();
}

/* -------------------------------------------------------------------------- */

export interface Session extends SessionState {
  adaptation: Adaptation;
  setAxis: (axis: Axis, level: Level) => void;
  setProfileComplete: (v: boolean) => void;
  setVerifiedWith: (m: ModalityId | null) => void;
  setAttestation: (a: Attestation | null) => void;
  setAvatar: (patch: Partial<AvatarChoice>) => void;
  shuffleAvatar: () => void;
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

  const setAvatar = useCallback((patch: Partial<AvatarChoice>) => {
    update((s) => ({ ...s, avatar: { ...s.avatar, ...patch }, avatarChosen: true }));
  }, []);

  // Reseeding clears the hue and tone overrides on purpose. They were dialled
  // against the previous creature; carrying them onto a new one produces a
  // shape wearing the last face's colour, which reads as the shuffle being
  // broken rather than as a setting persisting.
  const shuffleAvatar = useCallback(() => {
    update((s) => ({
      ...s,
      avatar: {
        ...s.avatar,
        seed: `blob-${Math.random().toString(36).slice(2, 10)}`,
        hue: null,
        tone: null,
      },
      avatarChosen: true,
    }));
  }, []);

  const toggleTheme = useCallback(() => {
    update((s) => ({ ...s, theme: s.theme === "light" ? "dark" : "light" }));
  }, []);

  const reset = useCallback(() => {
    update(() => ({
      ...INITIAL,
      profile: { ...DEFAULT_PROFILE },
      avatar: { ...DEFAULT_AVATAR },
      hydrated: true,
    }));
  }, []);

  const adaptation = useMemo(() => deriveAdaptation(snapshot.profile), [snapshot.profile]);

  return {
    ...snapshot,
    adaptation,
    setAxis,
    setProfileComplete,
    setVerifiedWith,
    setAttestation,
    setAvatar,
    shuffleAvatar,
    toggleTheme,
    reset,
  };
}
