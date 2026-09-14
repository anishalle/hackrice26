import type { RecordScopeId } from "./care";
import type { TrendTone } from "./patients";

/**
 * The long record: everything a check-in has produced for a patient, over time.
 *
 * `lib/patients.ts` carries the latest reading of each signal, because that is
 * what a clinician moves an axis against. This carries the history behind those
 * readings, which is a different question ("is this a bad week or a slope?")
 * and wants a different shape. Keeping them apart means the record screen can
 * be gated, paged and lazily read without the plot screen inheriting any of it.
 *
 * Every number here is synthetic. The shapes are modelled on what these
 * instruments actually look like in ALS (a slow functional decline, an FVC that
 * falls ahead of the symptoms a person reports, speech that degrades faster in
 * the evening) so that the screen reads as plausible, but nothing has been
 * taken from a real person and nothing should be read as clinical fact.
 */

export interface Series {
  id: string;
  label: string;
  unit: string;
  /** Oldest first. Aligned index-for-index with `labels`. */
  points: number[];
  labels: string[];
  tone: TrendTone;
  /** Which direction is the good one, for reading the slope. */
  betterWhen: "higher" | "lower";
  scope: RecordScopeId;
  /** One line on what the slope means. Written to be readable without the chart. */
  reading: string;
}

export type RecordingKind = "check-in" | "banking" | "note";

export interface Recording {
  id: string;
  date: string;
  kind: RecordingKind;
  durationSec: number;
  /** Whether a transcript was kept alongside the audio. */
  transcript: boolean;
  note: string;
}

export interface BankingSession {
  date: string;
  phrases: number;
  minutes: number;
}

export interface VoiceBank {
  banked: number;
  target: number;
  /** How usable a reconstruction would be today. */
  readiness: string;
  quality: string;
  sessions: BankingSession[];
}

export interface FunctionalScore {
  date: string;
  domains: { label: string; score: number; max: number }[];
  total: number;
  max: number;
}

export interface PatientRecords {
  series: Series[];
  recordings: Recording[];
  voiceBank: VoiceBank | null;
  functional: FunctionalScore[];
}

const W = [
  "W1", "W2", "W3", "W4", "W5", "W6", "W7",
  "W8", "W9", "W10", "W11", "W12", "W13", "W14",
];

const ANISH_RECORDS: PatientRecords = {
  series: [
    {
      id: "rate",
      label: "Speaking rate",
      unit: "wpm",
      points: [151, 150, 148, 149, 145, 144, 145, 142, 140, 139, 138, 136, 138, 132],
      labels: W,
      tone: "amber",
      betterWhen: "higher",
      scope: "signals",
      reading:
        "Down 19 wpm across fourteen weeks. The fall is gradual rather than stepped, and steepest in clips recorded after five in the afternoon.",
    },
    {
      id: "pause",
      label: "Mean pause",
      unit: "s",
      points: [0.6, 0.6, 0.6, 0.65, 0.65, 0.7, 0.7, 0.7, 0.75, 0.8, 0.8, 0.85, 0.8, 0.9],
      labels: W,
      tone: "amber",
      betterWhen: "lower",
      scope: "signals",
      reading:
        "Lengthening alongside the rate, which points at fatigue rather than a change in what he is trying to say.",
    },
    {
      id: "confidence",
      label: "Recognition confidence",
      unit: "%",
      points: [97, 97, 96, 97, 96, 96, 95, 95, 95, 94, 95, 94, 94, 94],
      labels: W,
      tone: "periwinkle",
      betterWhen: "higher",
      scope: "signals",
      reading:
        "Holding near the top of the range. Speech is slower but still being understood, so voice input is not yet the bottleneck.",
    },
    {
      id: "accuracy",
      label: "Tap accuracy",
      unit: "%",
      points: [96, 95, 95, 94, 94, 93, 92, 90, 88, 87, 88, 91, 91, 91],
      labels: W,
      tone: "amber",
      betterWhen: "higher",
      scope: "signals",
      reading:
        "Fell to 87% by week eleven, then recovered three points the week targets were grown. The recovery is the adaptation working, not the condition reversing.",
    },
    {
      id: "bank",
      label: "Voice bank",
      unit: "phrases",
      points: [0, 40, 110, 190, 280, 380, 470, 580, 690, 790, 900, 1000, 1100, 1240],
      labels: W,
      tone: "mint",
      betterWhen: "higher",
      scope: "voicebank",
      reading:
        "Steady accumulation with no week missed. At this rate the 1,500-phrase target lands inside three weeks.",
    },
    {
      id: "fvc",
      label: "Forced vital capacity",
      unit: "% predicted",
      points: [94, 94, 93, 93, 92, 91, 91, 90, 89, 89, 88, 87, 87, 86],
      labels: W,
      tone: "periwinkle",
      betterWhen: "higher",
      scope: "respiratory",
      reading:
        "Declining about half a point a week. Still well above the threshold where intervention is usually discussed, and worth watching rather than acting on.",
    },
  ],

  recordings: [
    {
      id: "r14",
      date: "Mar 12",
      kind: "check-in",
      durationSec: 184,
      transcript: true,
      note: "Week 14 check-in. Swallowing mentioned unprompted and logged separately.",
    },
    {
      id: "r13b",
      date: "Mar 10",
      kind: "banking",
      durationSec: 612,
      transcript: false,
      note: "Banking sitting, capped at eighteen minutes where volume starts falling off.",
    },
    {
      id: "r13",
      date: "Mar 5",
      kind: "check-in",
      durationSec: 203,
      transcript: true,
      note: "Week 13 check-in. Filler rate up; rate itself flat for a third week.",
    },
    {
      id: "r12n",
      date: "Mar 1",
      kind: "note",
      durationSec: 41,
      transcript: true,
      note: "Voice note to care team after targets were grown.",
    },
    {
      id: "r12",
      date: "Feb 26",
      kind: "check-in",
      durationSec: 171,
      transcript: true,
      note: "Week 12 check-in. First week at the larger target size.",
    },
    {
      id: "r11",
      date: "Feb 19",
      kind: "check-in",
      durationSec: 166,
      transcript: true,
      note: "Week 11 check-in. Tap accuracy at its lowest recorded point.",
    },
  ],

  voiceBank: {
    banked: 1240,
    target: 1500,
    readiness: "Usable for short phrases today; full reconstruction at target.",
    quality: "Clean. No sitting has run past the eighteen-minute fatigue point.",
    sessions: [
      { date: "Mar 10", phrases: 140, minutes: 10 },
      { date: "Mar 3", phrases: 100, minutes: 8 },
      { date: "Feb 24", phrases: 110, minutes: 9 },
      { date: "Feb 17", phrases: 100, minutes: 8 },
    ],
  },

  functional: [
    {
      date: "Mar 1",
      total: 38,
      max: 48,
      domains: [
        { label: "Speech", score: 3, max: 4 },
        { label: "Swallowing", score: 3, max: 4 },
        { label: "Handwriting", score: 2, max: 4 },
        { label: "Dressing", score: 3, max: 4 },
        { label: "Walking", score: 3, max: 4 },
        { label: "Breathing", score: 4, max: 4 },
      ],
    },
    {
      date: "Dec 2",
      total: 41,
      max: 48,
      domains: [
        { label: "Speech", score: 4, max: 4 },
        { label: "Swallowing", score: 4, max: 4 },
        { label: "Handwriting", score: 3, max: 4 },
        { label: "Dressing", score: 3, max: 4 },
        { label: "Walking", score: 3, max: 4 },
        { label: "Breathing", score: 4, max: 4 },
      ],
    },
  ],
};

/**
 * The other patients carry a thin record on purpose.
 *
 * They exist so the caseload reads as a caseload; giving each of them fourteen
 * weeks of invented instrument data would be a lot of fiction to maintain for
 * screens the demo never opens, and every extra invented number is another
 * thing that has to stay consistent with the feed.
 */
const THIN: PatientRecords = {
  series: [],
  recordings: [],
  voiceBank: null,
  functional: [],
};

const BY_PATIENT: Record<string, PatientRecords> = {
  anish: ANISH_RECORDS,
};

export function recordsFor(patientId: string): PatientRecords {
  return BY_PATIENT[patientId] ?? THIN;
}

export function hasFullRecord(patientId: string): boolean {
  return patientId in BY_PATIENT;
}

export function seriesInScope(patientId: string, scopes: RecordScopeId[]): Series[] {
  return recordsFor(patientId).series.filter((s) => scopes.includes(s.scope));
}

/** Movement from first to last reading, already signed for display. */
export function delta(s: Series): { value: number; improving: boolean; text: string } {
  const first = s.points[0];
  const last = s.points[s.points.length - 1];
  const value = Math.round((last - first) * 100) / 100;
  const improving = s.betterWhen === "higher" ? value > 0 : value < 0;
  const sign = value > 0 ? "+" : "";
  return { value, improving, text: `${sign}${value} ${s.unit}` };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}
