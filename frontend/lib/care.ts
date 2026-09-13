/**
 * Who may read what, on whom.
 *
 * Two gates, deliberately separate, because they fail differently and a person
 * reading the screen should be able to tell which one stopped them:
 *
 *   1. Assignment. A clinician sees a patient's record only if that patient
 *      put them on their care team. Not assigned is not "empty record", it is
 *      "no relationship", and the screen says so.
 *   2. Scope. An assigned clinician sees only the sections their role covers.
 *      The speech pathologist gets the voice work and nothing else; asking for
 *      a respiratory score is not a smaller version of their job, it is a
 *      different one.
 *
 * Withheld sections stay on screen naming what would unlock them, following
 * the same rule as the verification router and the consent surface: the app
 * does not hide its refusals. A clinician who cannot see a chart should know
 * the chart exists, because "I was never shown it" and "there was nothing
 * there" are very different things to be wrong about in a clinic.
 *
 * Simulated throughout. No real credential is checked and no real record is
 * read; the gate is a product surface, not a security boundary. A real
 * deployment puts this on the server and never ships the withheld data to the
 * client at all, which is the one thing this file cannot demonstrate.
 */

export type RecordScopeId =
  | "signals"
  | "recordings"
  | "voicebank"
  | "function"
  | "respiratory";

export interface RecordScope {
  id: RecordScopeId;
  label: string;
  /** FHIR-shaped path, shown in mono so the real shape is visible. */
  resource: string;
  /** What a clinician holding this can actually read. */
  covers: string;
}

export const RECORD_SCOPES: Record<RecordScopeId, RecordScope> = {
  signals: {
    id: "signals",
    label: "Weekly signals",
    resource: "Observation?category=survey",
    covers: "The measurements each check-in produced, and their trend over time.",
  },
  recordings: {
    id: "recordings",
    label: "Check-in recordings",
    resource: "Media?type=audio",
    covers: "The audio itself, plus transcripts where one was kept.",
  },
  voicebank: {
    id: "voicebank",
    label: "Voice bank",
    resource: "Media?type=audio&use=banking",
    covers: "Banked phrase count, session history and reconstruction readiness.",
  },
  function: {
    id: "function",
    label: "Functional scores",
    resource: "Observation?code=alsfrs-r",
    covers: "Periodic functional rating, by domain and total.",
  },
  respiratory: {
    id: "respiratory",
    label: "Respiratory",
    resource: "Observation?code=fvc",
    covers: "Forced vital capacity and the readings around it.",
  },
};

export interface Clinician {
  id: string;
  name: string;
  role: string;
  /** What this clinician may read on any patient who has assigned them. */
  scopes: RecordScopeId[];
}

export const CLINICIANS: Record<string, Clinician> = {
  reyes: {
    id: "reyes",
    name: "Dr. Amara Reyes",
    role: "Neurology · ALS clinic",
    scopes: ["signals", "recordings", "voicebank", "function", "respiratory"],
  },
  okafor: {
    id: "okafor",
    name: "Tomas Okafor",
    role: "Speech-language pathology",
    scopes: ["signals", "recordings", "voicebank"],
  },
  lindqvist: {
    id: "lindqvist",
    name: "Ines Lindqvist",
    role: "Respiratory therapy",
    scopes: ["function", "respiratory"],
  },
  /*
   * Deliberately assigned to nobody in the fixture set. Without someone who
   * fails the first gate, the screen can only ever demonstrate the second, and
   * "not on this person's care team" is the more important of the two to get
   * visibly right.
   */
  vance: {
    id: "vance",
    name: "Dr. Ruth Vance",
    role: "Cardiology",
    scopes: ["function", "respiratory"],
  },
};

export const CLINICIAN_LIST: Clinician[] = Object.values(CLINICIANS);

/** The default viewer: the one clinician who can see a whole record. */
export const DEFAULT_CLINICIAN_ID = "reyes";

export interface Assignment {
  clinicianId: string;
  /** When the patient added them. */
  since: string;
}

/**
 * Care teams, keyed by patient. The patient granted every entry here, which is
 * why this is indexed by them rather than by the clinician: a care team is
 * something a person has, not a caseload a provider owns.
 */
export const CARE_TEAM: Record<string, Assignment[]> = {
  anish: [
    { clinicianId: "reyes", since: "Nov 2024" },
    { clinicianId: "okafor", since: "Jan 2025" },
    { clinicianId: "lindqvist", since: "Feb 2025" },
  ],
  dea: [{ clinicianId: "okafor", since: "Mar 2024" }],
  ilse: [{ clinicianId: "reyes", since: "Jul 2024" }],
  kwesi: [{ clinicianId: "reyes", since: "Dec 2024" }],
  tam: [{ clinicianId: "reyes", since: "Sep 2024" }],
  rune: [{ clinicianId: "reyes", since: "Jan 2024" }],
};

export function careTeamFor(patientId: string): { clinician: Clinician; since: string }[] {
  return (CARE_TEAM[patientId] ?? [])
    .map((a) => {
      const clinician = CLINICIANS[a.clinicianId];
      return clinician ? { clinician, since: a.since } : null;
    })
    .filter((x): x is { clinician: Clinician; since: string } => x !== null);
}

export function isAssigned(clinicianId: string, patientId: string): boolean {
  return (CARE_TEAM[patientId] ?? []).some((a) => a.clinicianId === clinicianId);
}

export type AccessVerdict =
  | { allowed: true }
  | { allowed: false; because: "unassigned"; detail: string }
  | { allowed: false; because: "scope"; detail: string };

/**
 * Whether this clinician may read this section of this patient's record.
 *
 * Returns a reason rather than a boolean so the caller can render the refusal.
 * A caller that only needs the boolean reads `.allowed`, which keeps the
 * common case short without letting the reason get dropped by default.
 */
export function canRead(
  clinicianId: string,
  patientId: string,
  scope: RecordScopeId,
): AccessVerdict {
  const clinician = CLINICIANS[clinicianId];
  if (!clinician) {
    return { allowed: false, because: "unassigned", detail: "Unknown clinician." };
  }
  if (!isAssigned(clinicianId, patientId)) {
    return {
      allowed: false,
      because: "unassigned",
      detail: "You are not on this patient's care team. Only they can add you to it.",
    };
  }
  if (!clinician.scopes.includes(scope)) {
    return {
      allowed: false,
      because: "scope",
      detail: `${RECORD_SCOPES[scope].label} is outside ${clinician.role.split(" · ")[0]}. Ask the patient to widen what you can read.`,
    };
  }
  return { allowed: true };
}

/** The scopes this clinician actually holds on this patient, in display order. */
export function readableScopes(clinicianId: string, patientId: string): RecordScopeId[] {
  const all = Object.keys(RECORD_SCOPES) as RecordScopeId[];
  return all.filter((s) => canRead(clinicianId, patientId, s).allowed);
}
