import type { Axis } from "./capability";

/**
 * Meridian Health — a FICTIONAL insurer standing in for a real provider
 * integration. Everything here is simulated: no network call leaves the app, no
 * real record is read, and no real credential is accepted. The point of this
 * module is the *consent surface*, not the data: the user should be able to see
 * exactly which fields an app is asking to read, at what granularity, and for
 * how long, before anything is disclosed.
 *
 * Swapping in a real provider means replacing this file and the two routes that
 * use it. The scope shapes below deliberately mirror FHIR resource/field pairs
 * so that mapping is mechanical.
 */

export const PROVIDER = {
  name: "Meridian Health",
  /** Shown in the consent chrome so a demo viewer can never mistake it for real. */
  disclaimer: "Fictional provider. Simulated data. No real records are accessed.",
} as const;

export interface Scope {
  id: string;
  /** FHIR-shaped resource path, shown in mono so the user sees the real shape. */
  resource: string;
  /** Plain-language name of what is being read. */
  label: string;
  /** Why this app is asking. Written to be refusable. */
  reason: string;
  /** Which profile axes this scope can corroborate. */
  corroborates: Axis[];
  /** Whether the app can function if this is denied. */
  required: boolean;
}

export const SCOPES: Scope[] = [
  {
    id: "identity",
    resource: "Patient.name, Patient.birthDate",
    label: "Your name and date of birth",
    reason: "To confirm the person signing in is the person on the record.",
    corroborates: [],
    required: true,
  },
  {
    id: "vision",
    resource: "Condition?category=vision",
    label: "Vision-related diagnoses",
    reason: "To corroborate the vision axis of your profile so you don't have to prove it again.",
    corroborates: ["vision"],
    required: false,
  },
  {
    id: "hearing",
    resource: "Observation?code=audiometry",
    label: "Audiometry results",
    reason: "To corroborate the hearing axis of your profile.",
    corroborates: ["hearing"],
    required: false,
  },
  {
    id: "motor",
    resource: "Condition?category=neuromuscular",
    label: "Neuromuscular and mobility diagnoses",
    reason: "To corroborate the motor axis, which decides how you verify your identity.",
    corroborates: ["motor", "speech"],
    required: false,
  },
  {
    id: "devices",
    resource: "DeviceUseStatement",
    label: "Assistive devices on file",
    reason: "So the interface knows what you already use and doesn't fight it.",
    corroborates: ["motor", "vision"],
    required: false,
  },
];

/** Scopes this app will NOT ask for. Shown explicitly — absence is a feature. */
export const EXCLUDED = [
  "Medication history",
  "Mental health notes",
  "Genomic data",
  "Billing and claims",
  "Full clinical notes",
];

export function axesCorroborated(grantedScopeIds: string[]): Axis[] {
  const axes = new Set<Axis>();
  for (const scope of SCOPES) {
    if (grantedScopeIds.includes(scope.id)) scope.corroborates.forEach((a) => axes.add(a));
  }
  return [...axes];
}
