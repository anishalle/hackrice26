import { Paths } from 'expo-file-system';

// One recogniser for both jobs: it streams the transcript that lights the
// words up, and with `persist` on it also writes the audio it heard to a wav,
// which is the take the voice bank keeps. Recording separately with a second
// audio session would fight this one for the microphone.

// Resolved lazily: the module is native, so a build made before it was added
// (or Expo Go) has no such thing, and importing it at the top would take the
// whole app down at launch rather than just the check-in's ability to listen.
let module;
const speech = () => {
  if (module === undefined) {
    try {
      module = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
    } catch {
      module = null;
    }
  }
  return module;
};

export const speechAvailable = () => !!speech()?.isRecognitionAvailable();

export async function requestSpeechPermission() {
  const result = await speech()?.requestPermissionsAsync();
  return !!result?.granted;
}

// Listens until `stop()` or the recogniser gives up on its own. `onTranscript`
// gets the whole take so far on every partial; `onEnd` gets the final text and
// the wav uri once the session has fully closed.
export function listen({ onTranscript, onEnd, onError }) {
  const ExpoSpeechRecognitionModule = speech();
  if (!ExpoSpeechRecognitionModule) {
    onError?.(new Error('Axl cannot listen in this build. Rebuild the app with npx expo run:ios.'));
    onEnd?.({ transcript: '', uri: null });
    return { stop() {}, cancel() {} };
  }
  let uri = null;
  let finals = '';
  let live = '';
  const text = () => `${finals} ${live}`.trim();
  const add = (name, handler) => ExpoSpeechRecognitionModule.addListener(name, handler);
  const subscriptions = [
    add('result', (event) => {
      const heard = (event.results ?? []).map((r) => r.transcript).join(' ').trim();
      // iOS hands back one growing transcript; Android closes a segment at each
      // pause and starts the next from empty. Folding finals in and clearing
      // the live part serves both.
      if (event.isFinal) {
        finals = `${finals} ${heard}`.trim();
        live = '';
      } else {
        live = heard;
      }
      onTranscript?.(text());
    }),
    add('audioend', (event) => {
      if (event.uri) uri = event.uri;
    }),
    add('error', (event) => {
      // Silence and a deliberate stop are not faults.
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      onError?.(new Error(event.message || 'Axl could not hear you just now.'));
    }),
    add('end', () => {
      subscriptions.forEach((s) => s.remove());
      onEnd?.({ transcript: text(), uri });
    }),
  ];
  ExpoSpeechRecognitionModule.start({
    lang: 'en-US',
    interimResults: true,
    continuous: true,
    addsPunctuation: false,
    recordingOptions: {
      persist: true,
      outputDirectory: Paths.cache.uri,
      outputFileName: `checkin-${Date.now()}.wav`,
    },
  });
  return {
    stop: () => ExpoSpeechRecognitionModule.stop(),
    cancel: () => {
      subscriptions.forEach((s) => s.remove());
      ExpoSpeechRecognitionModule.abort();
    },
  };
}
