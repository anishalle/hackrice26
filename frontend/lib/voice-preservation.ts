export interface VoiceSample {
  id: string;
  original_filename: string;
  content_type: string;
  byte_size: number;
  phrase_hint: string | null;
  created_at: string;
}

export interface VoiceProfile {
  id: string;
  display_name: string;
  consent_granted_at: string;
  consent_version: string;
  provider_voice_id: string | null;
  provider_status: "collecting" | "ready" | "verification_required";
  sample_count: number;
  samples: VoiceSample[];
}

const backendUrl = () =>
  (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

function ownerHeaders(ownerSubject: string): HeadersInit {
  return { "X-Voice-Owner-Subject": ownerSubject };
}

async function readError(response: Response, fallback: string): Promise<never> {
  const payload = (await response.json().catch(() => ({}))) as { detail?: string };
  throw new Error(payload.detail ?? fallback);
}

export async function getVoiceProfile(ownerSubject: string): Promise<VoiceProfile | null> {
  const response = await fetch(`${backendUrl()}/api/v1/voice/profile`, {
    headers: ownerHeaders(ownerSubject),
  });
  if (response.status === 404) return null;
  if (!response.ok) return readError(response, "Could not load your voice profile.");
  return (await response.json()) as VoiceProfile;
}

export async function getRecordingAudio(ownerSubject: string, sampleId: string): Promise<Blob> {
  const response = await fetch(`${backendUrl()}/api/v1/voice/profile/samples/${sampleId}/audio`, {
    headers: ownerHeaders(ownerSubject), cache: "no-store",
  });
  if (!response.ok) return readError(response, "Could not load this recording.");
  return response.blob();
}

export async function setUpVoiceProfile(
  ownerSubject: string,
  displayName: string
): Promise<VoiceProfile> {
  const response = await fetch(`${backendUrl()}/api/v1/voice/profile`, {
    method: "POST",
    headers: { ...ownerHeaders(ownerSubject), "Content-Type": "application/json" },
    body: JSON.stringify({
      display_name: displayName,
      consent_confirmed: true,
      consent_version: "voice-preservation-v1",
    }),
  });
  if (!response.ok) return readError(response, "Could not save your consent.");
  return (await response.json()) as VoiceProfile;
}

export async function uploadVoiceSample(
  ownerSubject: string,
  recording: Blob,
  filename: string,
  phraseHint: string
): Promise<VoiceSample> {
  const form = new FormData();
  form.append("file", recording, filename);
  if (phraseHint.trim()) form.append("phrase_hint", phraseHint.trim());

  const response = await fetch(`${backendUrl()}/api/v1/voice/profile/samples`, {
    method: "POST",
    headers: ownerHeaders(ownerSubject),
    body: form,
  });
  if (!response.ok) return readError(response, "Could not save this recording.");
  return (await response.json()) as VoiceSample;
}

export async function deleteVoiceSample(ownerSubject: string, sampleId: string): Promise<void> {
  const response = await fetch(`${backendUrl()}/api/v1/voice/profile/samples/${sampleId}`, {
    method: "DELETE",
    headers: ownerHeaders(ownerSubject),
  });
  if (!response.ok) return readError(response, "Could not delete this recording.");
}

export async function createVoiceClone(ownerSubject: string): Promise<VoiceProfile> {
  return requestVoiceClone(ownerSubject, "clone", "Could not create your voice.");
}

export async function rebuildVoiceClone(ownerSubject: string): Promise<VoiceProfile> {
  return requestVoiceClone(ownerSubject, "rebuild", "Could not rebuild your voice.");
}

async function requestVoiceClone(
  ownerSubject: string,
  action: "clone" | "rebuild",
  fallback: string
): Promise<VoiceProfile> {
  const response = await fetch(`${backendUrl()}/api/v1/voice/profile/${action}`, {
    method: "POST",
    headers: { ...ownerHeaders(ownerSubject), "Content-Type": "application/json" },
    body: JSON.stringify({
      description: "User-consented voice preservation profile.",
      remove_background_noise: false,
    }),
  });
  if (!response.ok) return readError(response, fallback);

  await response.json();
  const profile = await getVoiceProfile(ownerSubject);
  if (!profile) throw new Error("Your voice profile could not be loaded.");
  return profile;
}

export async function generateVoiceSpeech(ownerSubject: string, text: string): Promise<Blob> {
  const response = await fetch(`${backendUrl()}/api/v1/voice/profile/speech`, {
    method: "POST",
    headers: { ...ownerHeaders(ownerSubject), "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) return readError(response, "Could not generate speech.");
  return response.blob();
}
