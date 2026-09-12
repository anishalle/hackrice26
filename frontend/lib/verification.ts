import type { Axis, Profile } from "./capability";

/**
 * Adaptive identity verification.
 *
 * A conventional liveness check assumes a body: one that can turn its head on
 * command, hold a document steady, read an instruction, or speak a passphrase.
 * Each modality below declares what it actually requires. The router checks
 * those requirements against the profile and reports, per modality, whether the
 * person can complete it — and if not, exactly which requirement failed.
 *
 * The failure reason is a product surface, not a log line: it is what the user
 * reads, and it is what makes the routing trustworthy instead of magical.
 */

export type ModalityId =
  | "selfie-liveness"
  | "voice-passphrase"
  | "document-scan"
  | "dwell-code"
  | "provider-attestation";

export interface Requirement {
  axis: Axis;
  /** Minimum level on that axis for this modality to be completable. */
  min: number;
  /** Named in the first person, describing the demand the check makes. */
  demand: string;
}

export interface Modality {
  id: ModalityId;
  name: string;
  /** One line on what the person actually does. */
  action: string;
  /** Seconds, typical. */
  duration: number;
  /** Assurance level this modality yields, IAL-style. Demo values. */
  assurance: "standard" | "high";
  requirements: Requirement[];
}

export const MODALITIES: Modality[] = [
  {
    id: "selfie-liveness",
    name: "Selfie liveness",
    action: "Turn your head left, then right, while the camera watches.",
    duration: 25,
    assurance: "high",
    requirements: [
      { axis: "motor", min: 2, demand: "turning your head on command" },
      { axis: "vision", min: 1, demand: "seeing the framing guide" },
    ],
  },
  {
    id: "voice-passphrase",
    name: "Voice passphrase",
    action: "Read a one-time phrase aloud.",
    duration: 20,
    assurance: "high",
    requirements: [{ axis: "speech", min: 2, demand: "speaking a phrase clearly enough to match" }],
  },
  {
    id: "document-scan",
    name: "Document scan",
    action: "Hold your ID steady in front of the camera.",
    duration: 40,
    assurance: "high",
    requirements: [
      { axis: "motor", min: 2, demand: "holding a document steady in frame" },
      { axis: "vision", min: 1, demand: "aligning the document with the guide" },
    ],
  },
  {
    id: "dwell-code",
    name: "Dwell code",
    action: "Rest on each digit of a one-time code until it fills.",
    duration: 60,
    assurance: "standard",
    requirements: [],
  },
  {
    id: "provider-attestation",
    name: "Provider attestation",
    action: "Your healthcare provider confirms your identity and your profile.",
    duration: 30,
    assurance: "high",
    requirements: [],
  },
];

export interface Blocker {
  axis: Axis;
  demand: string;
}

export interface ModalityVerdict {
  modality: Modality;
  available: boolean;
  blockers: Blocker[];
}

export function routeVerification(profile: Profile): ModalityVerdict[] {
  const verdicts = MODALITIES.map((modality) => {
    const blockers = modality.requirements
      .filter((r) => profile[r.axis] < r.min)
      .map((r) => ({ axis: r.axis, demand: r.demand }));
    return { modality, available: blockers.length === 0, blockers };
  });

  // Available first, then by fewest demands made of the person.
  return verdicts.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return a.modality.duration - b.modality.duration;
  });
}

export function recommended(verdicts: ModalityVerdict[]): ModalityVerdict | undefined {
  return verdicts.find((v) => v.available && v.modality.assurance === "high") ?? verdicts.find((v) => v.available);
}

/**
 * The count that makes the point on screen: how many of the industry-standard
 * checks this person is simply locked out of.
 */
export function blockedCount(verdicts: ModalityVerdict[]): number {
  return verdicts.filter((v) => !v.available).length;
}
