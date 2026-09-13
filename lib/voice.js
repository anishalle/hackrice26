import { backendFetch } from './backend';
import { getOwnerSubject } from './session-user';
import { playMp3 } from './voice-playback';
import { PROFILE } from '../data/profile';

// The banked voice: the backend's consent-backed voice profile, the ElevenLabs
// clone made from its recordings, and speech generated in it. The clone
// itself lives at ElevenLabs; the backend keeps only its id against the owner.

export const CONSENT_VERSION = 'voice-preservation-v1';

// What the profile shows for each provider state.
export const VOICE_STATUS = {
  collecting: 'No voice yet',
  ready: 'Ready',
  verification_required: 'Waiting on ElevenLabs verification',
};

export async function voiceRequest(path, options = {}) {
  const owner = await getOwnerSubject();
  const response = await backendFetch(`/voice${path}`, {
    ...options,
    headers: { 'X-Voice-Owner-Subject': owner, ...options.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(typeof data.detail === 'string' ? data.detail : `Voice request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return response;
}

const json = (path, options) => voiceRequest(path, options).then((r) => (r.status === 204 ? null : r.json()));

// The profile, created on first sight. Continuing into a recording is the
// consent, so the record exists before any microphone opens.
export async function ensureVoiceProfile() {
  try {
    return await json('/profile');
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  return json('/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: PROFILE.name, consent_confirmed: true, consent_version: CONSENT_VERSION }),
  });
}

// Why a voice cannot be made right now, or null when it can. The backend
// enforces the same rules; this is so the button can say so before a tap.
//
// Short takes stay in the bank but the provider will not take them, so a
// bank of only short lines is as blocked as an empty one, and says why.
export function cloneBlocker(profile) {
  if (!profile) return 'Loading your recordings.';
  if (profile.sample_count === 0) return 'Record a check-in first. Your voice is built from those lines.';
  if (profile.usable_sample_count === 0) {
    return `Each take needs to be at least ${profile.min_sample_seconds} seconds. Read the next check-in a little slower.`;
  }
  return null;
}

// Empties the bank for this install. The built voice, if any, is untouched.
export function clearRecordings() {
  return json('/profile/samples', { method: 'DELETE' });
}

// Build (or rebuild, with every recording saved since) the ElevenLabs voice.
export function createVoice({ replace = false } = {}) {
  return json('/profile/clone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Banked voice from Axl weekly check-ins',
      remove_background_noise: true,
      replace_existing: replace,
    }),
  });
}

export function removeVoice() {
  return json('/profile/clone', { method: 'DELETE' });
}

export const hasVoice = (profile) => profile?.provider_status === 'ready';

// Say `text` out loud in the banked voice. Resolves once playback has ended.
// Throws with a readable message when there is no voice yet.
export async function speakInVoice(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const response = await voiceRequest('/profile/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: trimmed }),
  });
  await playMp3(await response.arrayBuffer());
}
