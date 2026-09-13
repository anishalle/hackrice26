"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_PROFILE, type Attestation, type Axis, type Level, type Profile } from "./capability";
import { deriveAdaptation, type Adaptation } from "./adaptation";
import { DEFAULT_CLINICIAN_ID } from "./care";
import { FOCUS_PATIENT_ID, resolvePatient, type Patient } from "./patients";
import type { ModalityId } from "./verification";
import { cachedPatient, usePatients } from "./patient-api";

/* Bumped from axis.session.v1 with the rebrand, and again because the shape
   changed: a single `profile` became per-patient overrides. An old payload
   would have restored a `profile` key this no longer reads, leaving a session
   that looked restored and behaved default. */
const STORAGE_KEY = "aide.session.v2";

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
  /**
   * Which clinician is doing the looking.
   *
   * A real deployment reads this from the session the provider authenticated
   * into and never lets the client choose it. Here it is switchable on purpose:
   * the access rules are the product, and a demo that could only ever show one
   * viewer's version of a record could not show them working.
   */
  viewerClinicianId: string;
  /** Whose record the clinician currently has open. */
  activePatientId: string;
  /**
   * Clinician edits layered over the fixture profiles, keyed by patient id.
   * Sparse on purpose: a patient with no entry here reads as the profile they
   * arrived with, so "not yet reviewed" and "reviewed and left alone" stay
   * distinguishable.
   */
  patientProfiles: Record<string, Profile>;
  /**
   * Whether the viewer is currently seeing the app *as* the active patient.
   *
   * This is what keeps the clinician's own interface stable. The adaptation
   * drives document-level type scale and target size, so a screen that followed
   * the patient's profile unconditionally would grow the doctor's buttons every
   * time they moved an axis. Previewing is entered deliberately and left the
   * same way.
   */
  previewing: boolean;
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
  viewerClinicianId: DEFAULT_CLINICIAN_ID,
  activePatientId: FOCUS_PATIENT_ID,
  patientProfiles: {},
  previewing: false,
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
    patientProfiles: { ...(restored.patientProfiles ?? {}) },
    // Never restore into a preview. Previewing swaps the whole interface for
    // someone else's, and coming back to a reloaded tab already inside one,
    // with no memory of having entered it, reads as the app being broken.
    previewing: false,
    hydrated: true,
  };
  emit();
}

/* -------------------------------------------------------------------------- */

export interface Session extends SessionState {
  /** The patient whose record is open, resolved against the fixture set. */
  patient: Patient;
  /** That patient's profile including any clinician edits. */
  profile: Profile;
  adaptation: Adaptation;
  setActivePatient: (id: string) => void;
  setViewerClinician: (id: string) => void;
  setPreviewing: (v: boolean) => void;
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
  const catalog = usePatients();

  // Writes land on the active patient's overrides, seeded from the profile they
  // arrived with so a single moved axis does not reset the other four to full.
  const setAxis = useCallback((axis: Axis, level: Level) => {
    update((s) => {
      const target = cachedPatient(s.activePatientId) ?? resolvePatient(s.activePatientId);
      const current = s.patientProfiles[target.id] ?? target.profile;
      return {
        ...s,
        patientProfiles: { ...s.patientProfiles, [target.id]: { ...current, [axis]: level } },
      };
    });
  }, []);

  const setActivePatient = useCallback((id: string) => {
    update((s) => ({ ...s, activePatientId: id, previewing: false }));
  }, []);

  const setViewerClinician = useCallback((id: string) => {
    update((s) => ({ ...s, viewerClinicianId: id }));
  }, []);

  const setPreviewing = useCallback((v: boolean) => {
    update((s) => ({ ...s, previewing: v }));
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
      patientProfiles: {},
      avatar: { ...DEFAULT_AVATAR },
      hydrated: true,
    }));
  }, []);

  const patient = useMemo(
    () => catalog.patients.find((p) => p.id === snapshot.activePatientId) ?? resolvePatient(snapshot.activePatientId),
    [snapshot.activePatientId, catalog.patients],
  );

  const profile = useMemo(
    () => snapshot.patientProfiles[patient.id] ?? patient.profile,
    [snapshot.patientProfiles, patient],
  );

  /*
   * Only a preview adapts the document.
   *
   * `adaptation` reaches the root as type scale, target size, density and
   * contrast, so deriving it from the open patient unconditionally would mean a
   * clinician's own buttons growing as they moved someone else's motor axis.
   * Outside a preview the viewer gets the default interface; inside one they
   * get the patient's, which is the entire point of entering it.
   */
  const adaptation = useMemo(
    () => deriveAdaptation(snapshot.previewing ? profile : DEFAULT_PROFILE),
    [snapshot.previewing, profile],
  );

  return {
    ...snapshot,
    patient,
    profile,
    adaptation,
    setActivePatient,
    setViewerClinician,
    setPreviewing,
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
