/**
 * The capability profile attached to a Persona ID.
 *
 * This is the product's central data structure. Two things read it at runtime:
 * the verification router (which identity checks can this person complete?) and
 * the interface renderer (what should the UI become?). Nothing else in the app
 * is allowed to branch on disability — it branches on this.
 */

export const AXES = ["vision", "hearing", "motor", "speech", "cognitive"] as const;
export type Axis = (typeof AXES)[number];

/** 0 is the most support needed, 3 the least. Ordered so comparisons read naturally. */
export type Level = 0 | 1 | 2 | 3;

export interface AxisStop {
  level: Level;
  /** First person, present tense. Never a deficit noun. */
  label: string;
  /** The mono annotation shown on the plot. */
  code: string;
}

export interface AxisSpec {
  axis: Axis;
  title: string;
  /** The question, asked in the first person. */
  question: string;
  unit: string;
  stops: AxisStop[];
}

export const AXIS_SPECS: Record<Axis, AxisSpec> = {
  vision: {
    axis: "vision",
    title: "Vision",
    question: "How do you read a screen?",
    unit: "acuity",
    stops: [
      { level: 0, label: "I don't use sight to read a screen", code: "NON-VISUAL" },
      { level: 1, label: "I read with heavy magnification", code: "LOW / MAG" },
      { level: 2, label: "I read large text comfortably", code: "LOW" },
      { level: 3, label: "I read normal text comfortably", code: "FULL" },
    ],
  },
  hearing: {
    axis: "hearing",
    title: "Hearing",
    question: "How do you take in audio?",
    unit: "dB HL",
    stops: [
      { level: 0, label: "I don't use audio", code: "DEAF" },
      { level: 1, label: "I need captions for everything", code: "SEVERE" },
      { level: 2, label: "I hear clear speech, captions help", code: "MILD" },
      { level: 3, label: "I hear audio comfortably", code: "FULL" },
    ],
  },
  motor: {
    axis: "motor",
    title: "Motor control",
    question: "How do you move and point?",
    unit: "range",
    stops: [
      { level: 0, label: "I use a switch or eye gaze", code: "SWITCH / GAZE" },
      { level: 1, label: "I can't reliably turn my head or hold a device", code: "LIMITED RANGE" },
      { level: 2, label: "I point accurately but tire quickly", code: "REDUCED" },
      { level: 3, label: "I point and move freely", code: "FULL" },
    ],
  },
  speech: {
    axis: "speech",
    title: "Speech",
    question: "How do you speak aloud?",
    unit: "intelligibility",
    stops: [
      { level: 0, label: "I don't speak aloud", code: "NON-SPEAKING" },
      { level: 1, label: "Speech recognition rarely understands me", code: "LOW INTELLIG." },
      { level: 2, label: "Speech recognition usually understands me", code: "VARIABLE" },
      { level: 3, label: "Speech recognition understands me", code: "FULL" },
    ],
  },
  cognitive: {
    axis: "cognitive",
    title: "Pace",
    question: "How much do you want on screen at once?",
    unit: "load",
    stops: [
      { level: 0, label: "One thing at a time, no time limits", code: "ONE-AT-A-TIME" },
      { level: 1, label: "Keep it simple and slow", code: "LOW DENSITY" },
      { level: 2, label: "Normal, but no surprises", code: "STEADY" },
      { level: 3, label: "Show me everything", code: "FULL" },
    ],
  },
};

export type Profile = Record<Axis, Level>;

/** Everyone starts at full; the person subtracts what isn't true for them. */
export const DEFAULT_PROFILE: Profile = {
  vision: 3,
  hearing: 3,
  motor: 3,
  speech: 3,
  cognitive: 3,
};

export function stopFor(axis: Axis, level: Level): AxisStop {
  const stop = AXIS_SPECS[axis].stops.find((s) => s.level === level);
  if (!stop) throw new Error(`no stop for ${axis} at level ${level}`);
  return stop;
}

export function isDefault(profile: Profile): boolean {
  return AXES.every((a) => profile[a] === DEFAULT_PROFILE[a]);
}

/** Short mono summary, e.g. "V3 H3 M1 S3 C2" — used as the profile's fingerprint. */
export function fingerprint(profile: Profile): string {
  return AXES.map((a) => `${a[0].toUpperCase()}${profile[a]}`).join(" ");
}

// ---------------------------------------------------------------------------
// Attestation
// ---------------------------------------------------------------------------

/**
 * Which axes a healthcare provider has corroborated. Demo-only: nothing here
 * touches a real record. See lib/meridian.ts.
 */
export type Attestation = {
  provider: string;
  attestedAt: string;
  axes: Axis[];
};
