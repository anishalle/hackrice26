"use client";

import { useState } from "react";
import type { Profile } from "@/lib/capability";
import { patientApiUrl, reloadPatients } from "@/lib/patient-api";
import { useSession } from "@/lib/session";

export function SavePatientProfile({ patientId, profile }: { patientId: string; profile: Profile }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const { acknowledgeSavedProfile } = useSession();
  async function save() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`${patientApiUrl()}/api/v1/patients/${encodeURIComponent(patientId)}/profile`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error(`Could not save profile (${response.status}).`);
      setMessage("Profile saved to PostgreSQL.");
      if (await reloadPatients()) acknowledgeSavedProfile(patientId, profile);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save profile.");
    } finally { setSaving(false); }
  }
  return <div className="mt-5">
    <button type="button" onClick={() => void save()} disabled={saving}
      className="target rounded-[var(--r-pill)] border border-[var(--line)] px-5 text-sm disabled:opacity-50">
      {saving ? "Saving…" : "Save profile to database"}
    </button>
    <p role="status" className="mt-2 text-xs text-[var(--text-2)]">{message || "Axis changes preview locally until you save."}</p>
  </div>;
}
