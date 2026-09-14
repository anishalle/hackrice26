// The browser's own recogniser, with a MediaRecorder alongside it: the Web
// Speech API never hands back the audio it heard, so the take for the voice
// bank has to be captured separately. Same surface as the native module.

const Recognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

export const speechAvailable = () => !!Recognition;

export async function requestSpeechPermission() {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

export function listen({ onTranscript, onEnd, onError }) {
  if (!Recognition) {
    onError?.(new Error('This browser cannot listen. Try Safari or Chrome.'));
    onEnd?.({ transcript: '', blob: null });
    return { stop() {}, cancel() {} };
  }
  let finals = '';
  let live = '';
  let ended = false;
  let recorder = null;
  let stream = null;
  const chunks = [];
  const text = () => `${finals} ${live}`.trim();

  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) finals = `${finals} ${result[0].transcript}`.trim();
      else interim += result[0].transcript;
    }
    live = interim.trim();
    onTranscript?.(text());
  };
  recognition.onerror = (event) => {
    if (event.error === 'no-speech' || event.error === 'aborted') return;
    onError?.(new Error(event.message || 'The browser could not hear you just now.'));
  };

  const finish = () => {
    if (ended) return;
    ended = true;
    const done = (blob) => {
      stream?.getTracks().forEach((track) => track.stop());
      onEnd?.({ transcript: text(), blob });
    };
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => done(chunks.length ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }) : null);
      recorder.stop();
    } else {
      done(null);
    }
  };
  recognition.onend = finish;

  // Recording is best effort: a browser that refuses the microphone still
  // gets the transcript, and the take is simply not kept.
  navigator.mediaDevices?.getUserMedia({ audio: true }).then((granted) => {
    if (ended) { granted.getTracks().forEach((track) => track.stop()); return; }
    stream = granted;
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.start();
  }).catch(() => {});
  recognition.start();

  return {
    stop: () => recognition.stop(),
    cancel: () => {
      recognition.onend = null;
      recognition.abort();
      ended = true;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      stream?.getTracks().forEach((track) => track.stop());
    },
  };
}
