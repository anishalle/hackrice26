import { DEFAULT_PROFILE, type Axis, type Profile } from "./capability";
import type { ExpressionId } from "./session";
import type { PatientRecords } from "./records";

/**
 * The clinician's caseload.
 *
 * This is the seam between the two halves of the product. The capability
 * profile is the *control*: five axes a clinician moves, and everything the
 * interface does downstream derives from it via `deriveAdaptation`. A trend is
 * the *evidence*: a number the weekly check-in actually measured, carrying the
 * axis it speaks to so it can be rendered beside the control it justifies.
 *
 * Keeping them as separate types matters. A clinician who moves the speech axis
 * because "speaking rate is down 6 this week" is doing something defensible; one
 * who moves it on impression is not, and a UI that cannot tell the two apart
 * cannot show the difference. So trends are never derived from the profile and
 * the profile is never derived from trends — the clinician is the link, and the
 * screen's whole job is to put the two side by side while they decide.
 *
 * Everything here is synthetic and labelled as such wherever it is shown. The
 * numbers are shaped to be plausible rather than pulled from anything real.
 */

/** Matches the four accents in the companion app's palette. */
export type TrendTone = "amber" | "periwinkle" | "mint" | "peach";

export interface Trend {
  id: string;
  /** The axis this measurement speaks to. Drives the evidence/control pairing. */
  axis: Axis;
  label: string;
  /** The measurement itself, pre-formatted with its unit. */
  value: string;
  /** Movement since the previous check-in, in words. */
  delta: string;
  tone: TrendTone;
}

export interface CheckInFlag {
  tone: TrendTone;
  text: string;
}

export interface CheckIn {
  id: string;
  date: string;
  title: string;
  summary: string;
  flags: CheckInFlag[];
}

export interface PatientAvatar {
  seed: string;
  hue: number | null;
  tone: number | null;
  expression: ExpressionId;
}

export interface Patient {
  records?: PatientRecords;
  id: string;
  name: string;
  /** How long they have been checking in, in words. */
  since: string;
  diagnosis: string;
  /**
   * The demo subject, pinned to the top of the caseload and the one the
   * clinician lands on. Exactly one patient carries this.
   */
  focus: boolean;
  profile: Profile;
  avatar: PatientAvatar;
  trends: Trend[];
  checkins: CheckIn[];
  /** Axes a provider has corroborated. See lib/meridian.ts. */
  attested: Axis[];
}

function profile(overrides: Partial<Profile>): Profile {
  return { ...DEFAULT_PROFILE, ...overrides };
}

/**
 * Anish is the patient the demo follows.
 *
 * His profile is deliberately mid-range rather than extreme: speech and motor
 * both sitting at 2 means the trends below are pointing somewhere the clinician
 * has not gone yet, so moving an axis during the demo actually changes the
 * preview. A patient who already reads as fully adapted has nothing to show.
 */
const ANISH: Patient = {
  id: "anish",
  name: "Anish A.",
  since: "Week 14 of check-ins",
  diagnosis: "Limb-onset ALS, diagnosed Nov 2024",
  focus: true,
  profile: profile({ speech: 2, motor: 2 }),
  avatar: { seed: "anish-aide", hue: 268, tone: 0.52, expression: "idle" },
  attested: ["speech", "motor"],
  trends: [
    {
      id: "rate",
      axis: "speech",
      label: "Speaking rate",
      value: "132 wpm",
      delta: "down 6 this week",
      tone: "amber",
    },
    {
      id: "pause",
      axis: "speech",
      label: "Mean pause",
      value: "0.9s",
      delta: "up 0.1, longest in the evening",
      tone: "amber",
    },
    {
      id: "confidence",
      axis: "speech",
      label: "Recognition confidence",
      value: "94%",
      delta: "flat for three weeks",
      tone: "periwinkle",
    },
    {
      id: "accuracy",
      axis: "motor",
      label: "Tap accuracy",
      value: "91%",
      delta: "down 4 since January",
      tone: "amber",
    },
    {
      id: "dwell",
      axis: "motor",
      label: "Hold steadiness",
      value: "480ms",
      delta: "up 60ms to register a press",
      tone: "periwinkle",
    },
    {
      id: "bank",
      axis: "speech",
      label: "Voice bank",
      value: "1,240 phrases",
      delta: "up 140 this week",
      tone: "mint",
    },
  ],
  checkins: [
    {
      id: "w14",
      date: "Mar 12",
      title: "Week 14 check-in",
      summary:
        "Three minutes spoken. Rate holds through the first half of the week and drops in the evening clips, with pauses lengthening alongside it.",
      flags: [
        { tone: "amber", text: "Speaking rate 132 wpm, down 6 from last week" },
        { tone: "amber", text: "Mean pause 0.9s, longest runs in the evening" },
        { tone: "periwinkle", text: "Recognition confidence 94%, unchanged" },
      ],
    },
    {
      id: "w13",
      date: "Mar 5",
      title: "Week 13 check-in",
      summary:
        "Voice steady for eighteen minutes, then noticeably softer. Banking is running ahead of schedule.",
      flags: [
        { tone: "mint", text: "140 phrases banked, no sitting run past fatigue" },
        { tone: "amber", text: "Filler rate up: 14 per hundred words" },
      ],
    },
    {
      id: "w12",
      date: "Feb 26",
      title: "Week 12 check-in",
      summary: "First week targets were grown. Tap accuracy recovered three points immediately.",
      flags: [{ tone: "mint", text: "Tap accuracy 91%, up 3 since targets grew" }],
    },
  ],
};

/**
 * The rest of the caseload. Thinner on purpose: they exist so the focus patient
 * sits in a real list rather than alone on a screen, and so the clinician view
 * reads as a caseload rather than a single-record page. Their profiles are the
 * ones the feed already attributes to them, so a reader who notices both sees
 * the same person twice rather than a contradiction.
 */
const OTHERS: Patient[] = [
  {
    id: "dea",
    name: "Dea M.",
    since: "Week 31 of check-ins",
    diagnosis: "Bulbar-onset ALS, diagnosed Mar 2024",
    focus: false,
    profile: profile({ motor: 0, speech: 1 }),
    avatar: { seed: "dea-aide", hue: 12, tone: 0.6, expression: "idle" },
    attested: ["motor", "speech"],
    trends: [
      {
        id: "rate",
        axis: "speech",
        label: "Speaking rate",
        value: "74 wpm",
        delta: "down 11 this month",
        tone: "peach",
      },
      {
        id: "switch",
        axis: "motor",
        label: "Switch dwell",
        value: "620ms",
        delta: "steady since gaze added",
        tone: "mint",
      },
    ],
    checkins: [
      {
        id: "w31",
        date: "Mar 11",
        title: "Week 31 check-in",
        summary: "Typed rather than spoken. Gaze input carried the whole session without a fallback.",
        flags: [{ tone: "peach", text: "Speech no longer a reliable input route" }],
      },
    ],
  },
  {
    id: "ilse",
    name: "Ilse V.",
    since: "Week 22 of check-ins",
    diagnosis: "Limb-onset ALS, diagnosed Jul 2024",
    focus: false,
    profile: profile({ motor: 1 }),
    avatar: { seed: "ilse-aide", hue: 150, tone: 0.45, expression: "idle" },
    attested: ["motor"],
    trends: [
      {
        id: "accuracy",
        axis: "motor",
        label: "Tap accuracy",
        value: "78%",
        delta: "down 9 this month",
        tone: "amber",
      },
    ],
    checkins: [
      {
        id: "w22",
        date: "Mar 10",
        title: "Week 22 check-in",
        summary: "Targets grown twice this month. Accuracy is recovering more slowly each time.",
        flags: [{ tone: "amber", text: "Second target growth in four weeks" }],
      },
    ],
  },
  {
    id: "kwesi",
    name: "Kwesi A.",
    since: "Week 9 of check-ins",
    diagnosis: "Limb-onset ALS, diagnosed Dec 2024",
    focus: false,
    profile: profile({ hearing: 0 }),
    avatar: { seed: "kwesi-aide", hue: 210, tone: 0.55, expression: "idle" },
    attested: ["hearing"],
    trends: [
      {
        id: "captions",
        axis: "hearing",
        label: "Caption reliance",
        value: "100%",
        delta: "unchanged since intake",
        tone: "periwinkle",
      },
    ],
    checkins: [
      {
        id: "w9",
        date: "Mar 9",
        title: "Week 9 check-in",
        summary: "Written check-in. Nothing in the audio pipeline applies here.",
        flags: [{ tone: "periwinkle", text: "Audio signals not collected for this patient" }],
      },
    ],
  },
  {
    id: "tam",
    name: "Tam R.",
    since: "Week 17 of check-ins",
    diagnosis: "Limb-onset ALS, diagnosed Sep 2024",
    focus: false,
    profile: profile({ cognitive: 1, vision: 2 }),
    avatar: { seed: "tam-aide", hue: 44, tone: 0.5, expression: "idle" },
    attested: ["cognitive"],
    trends: [
      {
        id: "session",
        axis: "cognitive",
        label: "Session length",
        value: "4.2 min",
        delta: "down 1.1 this month",
        tone: "amber",
      },
    ],
    checkins: [
      {
        id: "w17",
        date: "Mar 8",
        title: "Week 17 check-in",
        summary: "Shorter sessions, more of them. Density was reduced two weeks ago and has held.",
        flags: [{ tone: "amber", text: "Sessions shortening, count rising" }],
      },
    ],
  },
  {
    id: "rune",
    name: "Rune O.",
    since: "Week 40 of check-ins",
    diagnosis: "Limb-onset ALS, diagnosed Jan 2024",
    focus: false,
    profile: profile({ vision: 0 }),
    avatar: { seed: "rune-aide", hue: 320, tone: 0.48, expression: "idle" },
    attested: ["vision"],
    trends: [
      {
        id: "voice",
        axis: "vision",
        label: "Voice-first sessions",
        value: "100%",
        delta: "unchanged for six months",
        tone: "mint",
      },
    ],
    checkins: [
      {
        id: "w40",
        date: "Mar 7",
        title: "Week 40 check-in",
        summary: "Spoken end to end, as every week. Rate and pauses both flat.",
        flags: [{ tone: "mint", text: "No change in any tracked signal" }],
      },
    ],
  },
];

/** Focus patient first; the rest follow in recency order. */
export const PATIENTS: Patient[] = [ANISH, ...OTHERS];

export const FOCUS_PATIENT_ID = ANISH.id;

export function patientById(id: string): Patient | undefined {
  return PATIENTS.find((p) => p.id === id);
}

/**
 * The patient a screen should act on, falling back to the focus patient.
 *
 * Every clinician surface goes through this rather than reading the id
 * directly, so a stored id pointing at a patient who is no longer in the
 * fixture set degrades to Anish instead of rendering an empty screen.
 */
export function resolvePatient(id: string | null | undefined): Patient {
  return (id ? patientById(id) : undefined) ?? PATIENTS[0];
}

/** The trends that speak to a given axis, in the order they were recorded. */
export function trendsForAxis(patient: Patient, axis: Axis): Trend[] {
  return patient.trends.filter((t) => t.axis === axis);
}

/**
 * Axes whose evidence is pointing somewhere the profile has not followed.
 *
 * An amber or peach trend is the check-in saying a number moved the wrong way;
 * an axis still sitting at full while carrying one is the case the clinician is
 * there to look at. This is what the caseload list counts, so "3 signals" on a
 * row means three things worth opening the record for rather than three
 * measurements taken.
 */
export function axesNeedingReview(patient: Patient): Axis[] {
  const flagged = patient.trends.filter((t) => t.tone === "amber" || t.tone === "peach");
  const axes = new Set<Axis>();
  for (const t of flagged) if (patient.profile[t.axis] === 3) axes.add(t.axis);
  return [...axes];
}

/** How many trends on this patient are moving the wrong way. */
export function flaggedTrendCount(patient: Patient): number {
  return patient.trends.filter((t) => t.tone === "amber" || t.tone === "peach").length;
}
