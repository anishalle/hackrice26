import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { voiceRequest } from './voice';

// The voice bank behind the weekly check-in: one encrypted sample per line
// read, against the owner in lib/session-user. Every call is best effort from
// the screen's point of view; a check-in never stalls on the network.

export { ensureVoiceProfile } from './voice';

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
  return voiceRequest('/profile/samples', { method: 'POST', body: form }).then((r) => r.json());
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
