import { Platform } from 'react-native';
import { backendFetch } from './backend';
import { File } from 'expo-file-system';
import { PROFILE } from '../data/profile';

// The voice bank behind the weekly check-in: the backend's consent-backed
// voice profile, and one encrypted sample per line read. Every call is best
// effort from the screen's point of view; a check-in never stalls on the
// network.

// ponytail: the backend takes the owner as a header for now, so the demo
// profile's handle stands in until it verifies the Appwrite session itself.
const OWNER = PROFILE.handle;
const CONSENT_VERSION = 'voice-preservation-v1';

async function voice(path, options = {}) {
  const response = await backendFetch(`/voice${path}`, {
    ...options,
    headers: { 'X-Voice-Owner-Subject': OWNER, ...options.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(typeof data.detail === 'string' ? data.detail : `Voice request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

// Continuing past the invite is the consent: the profile is created (or its
// consent refreshed) before any microphone is opened.
export async function ensureVoiceProfile() {
  try {
    return await voice('/profile');
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  return voice('/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: PROFILE.name, consent_version: CONSENT_VERSION }),
  });
}

// One take: the wav the native recogniser wrote, or the webm the browser
// recorded, with the line it was reading as the phrase hint.
export async function saveTake({ uri, blob, phrase }) {
  const form = new FormData();
  if (Platform.OS === 'web') {
    if (!blob) return null;
    form.append('file', blob, `checkin-${Date.now()}.webm`);
  } else {
    if (!uri) return null;
    form.append('file', new File(uri));
  }
  form.append('phrase_hint', phrase);
  return voice('/profile/samples', { method: 'POST', body: form });
}

// Word matching for the lit-up line. Punctuation and case are the reader's,
// not the recogniser's, so both sides are reduced to letters before comparing.
const clean = (word) => word.toLowerCase().replace(/[^a-z']/g, '');

export const wordsOf = (line) => line.split(/\s+/).filter(Boolean);

const close = (a, b) => {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  // One substitution, for the longer words a model most often mangles.
  if (a.length >= 5 && a.length === b.length) {
    let misses = 0;
    for (let i = 0; i < a.length && misses < 2; i += 1) if (a[i] !== b[i]) misses += 1;
    return misses < 2;
  }
  return false;
};

// How many words of `line`, in order, the transcript has reached. Walks the
// transcript once and lets it jump over up to two misheard words, so a single
// slip does not freeze the line. Never returns less than `floor`, because
// partial transcripts get revised and a lit word must not go dark again.
export function matchedCount(line, transcript, floor = 0) {
  const expected = wordsOf(line).map(clean);
  const heard = transcript.split(/\s+/).map(clean).filter(Boolean);
  let i = 0;
  for (const word of heard) {
    if (i >= expected.length) break;
    const jump = [0, 1, 2].find((j) => i + j < expected.length && close(expected[i + j], word));
    if (jump !== undefined) i += jump + 1;
  }
  return Math.max(floor, i);
}
