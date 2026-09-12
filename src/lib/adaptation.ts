import { AXES, type Axis, type Level, type Profile } from "./capability";

/**
 * Derives the interface from the profile.
 *
 * Every visual and behavioural difference in the app comes from this object.
 * Components never read the raw profile to decide how to look — they read the
 * adaptation. That keeps the mapping in one auditable place and means a new
 * axis changes one file.
 */
export interface Adaptation {
  /** The visual surface is not the primary channel. Voice leads. */
  voiceFirst: boolean;
  /** Type scale multiplier applied at the root. */
  typeScale: number;
  /** Minimum interactive target edge, in px. */
  targetSize: number;
  /** Push ink/paper contrast to maximum. */
  maxContrast: boolean;
  /** Audio never carries meaning alone. */
  captionsAlways: boolean;
  /** Agent speech is transcribed on screen by default. */
  transcriptDefault: boolean;
  /** Suppress non-essential motion. */
  reduceMotion: boolean;
  /** One decision per screen; hide secondary regions behind an explicit step. */
  oneThingAtATime: boolean;
  /** Drop optional content and decoration. */
  density: "full" | "reduced" | "minimal";
  /** Voice input can't be relied on for this person. */
  voiceInputUnavailable: boolean;
  /** Interactions must survive without hover or drag. */
  pointerFree: boolean;
  /** Dwell-to-activate instead of click, with a visible fill. */
  dwellActivation: boolean;
}

/** Human-readable record of *why* the interface changed. Rendered in the UI. */
export interface AdaptationNote {
  axis: Axis;
  /** What the product is doing differently. Never names a deficit. */
  effect: string;
}

export function deriveAdaptation(p: Profile): Adaptation {
  return {
    voiceFirst: p.vision === 0,
    typeScale: p.vision === 0 ? 1 : p.vision === 1 ? 1.5 : p.vision === 2 ? 1.25 : 1,
    targetSize: p.motor <= 1 ? 56 : p.motor === 2 ? 48 : 40,
    maxContrast: p.vision <= 2,
    captionsAlways: p.hearing <= 1,
    transcriptDefault: p.hearing <= 2,
    reduceMotion: p.cognitive <= 1,
    oneThingAtATime: p.cognitive === 0,
    density: p.cognitive === 0 ? "minimal" : p.cognitive === 1 ? "reduced" : "full",
    voiceInputUnavailable: p.speech <= 1,
    pointerFree: p.motor <= 1,
    dwellActivation: p.motor === 0,
  };
}

/**
 * The margin annotations. These are the leader-rule notes that draw out from
 * each mark on the plot — the product narrating its own adaptation.
 */
export function adaptationNotes(p: Profile): AdaptationNote[] {
  const notes: AdaptationNote[] = [];

  if (p.vision === 0) {
    notes.push({ axis: "vision", effect: "Interface leads with voice. Hold anywhere to talk." });
  } else if (p.vision === 1) {
    notes.push({ axis: "vision", effect: "Type set 50% larger, contrast at maximum." });
  } else if (p.vision === 2) {
    notes.push({ axis: "vision", effect: "Type set 25% larger, contrast raised." });
  }

  if (p.hearing <= 1) {
    notes.push({ axis: "hearing", effect: "Captions on everything. No audio-only cues." });
  } else if (p.hearing === 2) {
    notes.push({ axis: "hearing", effect: "Agent speech transcribed on screen by default." });
  }

  if (p.motor === 0) {
    notes.push({ axis: "motor", effect: "Dwell to activate. Switch and gaze input accepted." });
  } else if (p.motor === 1) {
    notes.push({ axis: "motor", effect: "Targets at 56px. No drag, no hover-only controls." });
  } else if (p.motor === 2) {
    notes.push({ axis: "motor", effect: "Targets at 48px. Fewer steps per task." });
  }

  if (p.speech <= 1) {
    notes.push({ axis: "speech", effect: "Voice input not required anywhere." });
  }

  if (p.cognitive === 0) {
    notes.push({ axis: "cognitive", effect: "One decision per screen. Motion off. No time limits." });
  } else if (p.cognitive === 1) {
    notes.push({ axis: "cognitive", effect: "Density reduced. Motion off." });
  }

  return notes;
}

/** True when the profile changes nothing — used to keep the empty state honest. */
export function hasAdaptations(p: Profile): boolean {
  return AXES.some((a) => p[a] !== 3);
}

export function levelIsFull(l: Level): boolean {
  return l === 3;
}
